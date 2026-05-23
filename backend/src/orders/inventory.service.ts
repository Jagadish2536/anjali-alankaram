import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Reserve stock during checkout.
   * Atomically increments reservedStock and creates reservation records.
   * Throws if any item is out of stock.
   */
  async reserve(
    orderId: string,
    items: { variantId: string; quantity: number }[],
    timeoutMins = 15,
  ) {
    const expiresAt = new Date(Date.now() + timeoutMins * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      for (const { variantId, quantity } of items) {
        // Check available stock
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { stock: true, reservedStock: true, sku: true },
        });

        if (!variant) throw new Error(`Variant ${variantId} not found`);

        const availableStock = variant.stock - variant.reservedStock;
        if (availableStock < quantity) {
          throw new Error(
            `Insufficient stock for variant ${variant.sku}. Available: ${availableStock}, requested: ${quantity}`,
          );
        }

        // Increment reservedStock
        await tx.productVariant.update({
          where: { id: variantId },
          data: { reservedStock: { increment: quantity } },
        });

        // Log the movement
        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'RESERVED'::\"InventoryMovementType",$2,$3,$3,$4,'Stock reserved for order'::text,NOW())`,
          variantId, quantity,
          variant.stock,
          orderId,
        );

        // Create reservation record
        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_reservations" ("id","orderId","variantId","quantity","isConfirmed","isReleased","expiresAt","createdAt")
           VALUES (gen_random_uuid(),$1,$2,$3,false,false,$4,NOW())`,
          orderId, variantId, quantity, expiresAt,
        );
      }
    });

    this.logger.log(`Reserved stock for order ${orderId}`);
  }

  /**
   * Confirm reservation — deducts actual stock and marks reservation confirmed.
   * Called after payment is verified.
   */
  async confirm(orderId: string) {
    const reservations = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_reservations" WHERE "orderId" = $1 AND "isConfirmed" = false AND "isReleased" = false`,
      orderId,
    );

    if (!reservations.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const res of reservations) {
        const variant = await tx.productVariant.findUnique({
          where: { id: res.variantId },
          select: { stock: true, reservedStock: true },
        });

        if (!variant) continue;

        const newStock = Math.max(0, variant.stock - res.quantity);
        const newReserved = Math.max(0, variant.reservedStock - res.quantity);

        await tx.productVariant.update({
          where: { id: res.variantId },
          data: { stock: newStock, reservedStock: newReserved },
        });

        // Also update product.totalSold
        const orderItem = await tx.orderItem.findFirst({
          where: { orderId, variantId: res.variantId },
        });
        if (orderItem) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { totalSold: { increment: res.quantity } },
          });
        }

        // Log deduction
        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'DEDUCTED'::\"InventoryMovementType",$2,$3,$4,$5,'Stock deducted after payment confirmed'::text,NOW())`,
          res.variantId, res.quantity,
          variant.stock, newStock, orderId,
        );

        // Mark reservation confirmed
        await tx.$executeRawUnsafe(
          `UPDATE "inventory_reservations" SET "isConfirmed" = true WHERE "id" = $1`,
          res.id,
        );
      }
    });

    // Check for low stock and alert
    await this.checkLowStock(reservations.map(r => r.variantId));

    this.logger.log(`Confirmed inventory for order ${orderId}`);
  }

  /**
   * Rollback — release reserved stock on cancellation.
   * Handles two cases:
   *  1. Reservation NOT yet confirmed (isConfirmed=false) → just decrement reservedStock
   *  2. Reservation already confirmed (isConfirmed=true, stock deducted) → add stock back
   */
  async rollback(orderId: string, actorId?: string) {
    // Case 1: unreleased, unconfirmed reservations (pre-payment)
    const unconfirmed = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_reservations" 
       WHERE "orderId" = $1 AND "isReleased" = false AND "isConfirmed" = false`,
      orderId,
    );

    // Case 2: confirmed reservations (stock already deducted)
    const confirmed = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_reservations" 
       WHERE "orderId" = $1 AND "isReleased" = false AND "isConfirmed" = true`,
      orderId,
    );

    if (!unconfirmed.length && !confirmed.length) {
      // No reservations at all — fallback: restore stock from order items directly
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId },
        select: { variantId: true, quantity: true },
      });
      if (orderItems.length) {
        await this.prisma.$transaction(async (tx) => {
          for (const item of orderItems) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              select: { stock: true },
            });
            const newStock = (variant?.stock ?? 0) + item.quantity;
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock },
            });
            await tx.$executeRawUnsafe(
              `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","actorId","notes","createdAt")
               VALUES (gen_random_uuid(),$1,'RESTOCKED'::"InventoryMovementType",$2,$3,$4,$5,$6,'Stock restored on cancellation (no reservation found)',NOW())`,
              item.variantId, item.quantity,
              variant?.stock ?? 0, newStock, orderId, actorId ?? null,
            );
          }
        });
        this.logger.log(`Restored stock via fallback for cancelled order ${orderId}`);
      }
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Case 1: unconfirmed → just release the reservation (reservedStock decrement)
      for (const res of unconfirmed) {
        await tx.productVariant.update({
          where: { id: res.variantId },
          data: { reservedStock: { decrement: res.quantity } },
        });

        const variant = await tx.productVariant.findUnique({
          where: { id: res.variantId },
          select: { stock: true },
        });

        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","actorId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'RESERVATION_RELEASED'::"InventoryMovementType",$2,$3,$3,$4,$5,'Reservation released on cancellation',NOW())`,
          res.variantId, res.quantity,
          variant?.stock ?? 0,
          orderId, actorId ?? null,
        );

        await tx.$executeRawUnsafe(
          `UPDATE "inventory_reservations" SET "isReleased" = true WHERE "id" = $1`,
          res.id,
        );
      }

      // Case 2: confirmed → stock was already deducted, so add it back
      for (const res of confirmed) {
        const variant = await tx.productVariant.findUnique({
          where: { id: res.variantId },
          select: { stock: true },
        });

        const newStock = (variant?.stock ?? 0) + res.quantity;

        await tx.productVariant.update({
          where: { id: res.variantId },
          data: { stock: newStock },
        });

        // Also reverse totalSold on the product
        const orderItem = await tx.orderItem.findFirst({
          where: { orderId, variantId: res.variantId },
        });
        if (orderItem) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { totalSold: { decrement: res.quantity } },
          });
        }

        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","actorId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'RESTOCKED'::"InventoryMovementType",$2,$3,$4,$5,$6,'Stock restored on cancellation (was confirmed)',NOW())`,
          res.variantId, res.quantity,
          variant?.stock ?? 0, newStock, orderId, actorId ?? null,
        );

        await tx.$executeRawUnsafe(
          `UPDATE "inventory_reservations" SET "isReleased" = true WHERE "id" = $1`,
          res.id,
        );
      }
    });

    this.logger.log(`Rolled back inventory for order ${orderId} (unconfirmed: ${unconfirmed.length}, confirmed: ${confirmed.length})`);
  }

  /**
   * Restock on return — adds stock back and decrements totalSold.
   * Called when admin marks order as RETURNED.
   */
  async restockOnReturn(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, quantity: true, productId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });

        const oldStock = variant?.stock ?? 0;
        const newStock = oldStock + item.quantity;

        // Restore stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        // Reverse totalSold
        await tx.product.update({
          where: { id: item.productId },
          data: { totalSold: { decrement: item.quantity } },
        });

        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'RESTOCKED'::"InventoryMovementType",$2,$3,$4,$5,'Stock restored after return',NOW())`,
          item.variantId, item.quantity,
          oldStock, newStock, orderId,
        );
      }
    });

    this.logger.log(`Restocked inventory for returned order ${orderId}`);
  }

  /**
   * Get inventory movements for a variant.
   */
  async getMovementLog(variantId: string, limit = 50) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_logs" WHERE "variantId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
      variantId, limit,
    );
  }

  /**
   * Get all low-stock variants.
   */
  async getLowStockItems(threshold = 5) {
    return this.prisma.productVariant.findMany({
      where: { stock: { lte: threshold }, isActive: true },
      include: {
        product: { select: { name: true, slug: true, images: true } },
      },
      orderBy: { stock: 'asc' },
    });
  }

  /**
   * Cron: Release expired reservations every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredReservations() {
    const expired = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_reservations" 
       WHERE "isConfirmed" = false AND "isReleased" = false AND "expiresAt" < NOW()`,
    );

    if (!expired.length) return;

    this.logger.log(`Releasing ${expired.length} expired inventory reservations`);

    for (const res of expired) {
      try {
        await this.prisma.productVariant.update({
          where: { id: res.variantId },
          data: { reservedStock: { decrement: res.quantity } },
        });

        await this.prisma.$executeRawUnsafe(
          `UPDATE "inventory_reservations" SET "isReleased" = true WHERE "id" = $1`,
          res.id,
        );

        this.logger.log(`Released expired reservation ${res.id} for order ${res.orderId}`);
      } catch (e) {
        this.logger.error(`Failed to release reservation ${res.id}: ${e.message}`);
      }
    }
  }

  private async checkLowStock(variantIds: string[]) {
    // Check threshold from settings
    const settings = await this.prisma.storeSettings.findFirst({
      select: { lowStockThreshold: true },
    });
    const threshold = (settings as any)?.lowStockThreshold ?? 5;

    const lowItems = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, stock: { lte: threshold } },
      include: { product: { select: { name: true } } },
    });

    if (lowItems.length > 0) {
      this.logger.warn(
        `Low stock alert: ${lowItems.map(v => `${v.product.name} (${v.sku}): ${v.stock}`).join(', ')}`,
      );
    }
  }
}
