import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT w.*,
        (SELECT COUNT(*) FROM "warehouse_inventory" wi WHERE wi."warehouseId" = w.id)::int as "variantCount",
        (SELECT COALESCE(SUM(quantity),0) FROM "warehouse_inventory" wi WHERE wi."warehouseId" = w.id)::int as "totalStock",
        (SELECT COUNT(*) FROM "orders" o WHERE o."warehouseId" = w.id AND o.status NOT IN ('DELIVERED','CANCELLED','REFUNDED'))::int as "activeOrders"
      FROM "warehouses" w
      ORDER BY "isDefault" DESC, "createdAt" ASC
    `);
  }

  async findOne(id: string) {
    const warehouses = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "warehouses" WHERE id = $1`, id
    );
    if (!warehouses.length) throw new NotFoundException('Warehouse not found');
    return warehouses[0];
  }

  async create(data: {
    name: string; code: string; address: string;
    city: string; state: string; pincode: string;
    phone?: string; email?: string; isDefault?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone || null,
        email: data.email || null,
        isDefault: data.isDefault || false,
        status: 'ACTIVE',
      },
    });

    // Automatically sync all active variants to this new warehouse!
    const activeVariants = await this.prisma.productVariant.findMany({
      where: { 
        isActive: true,
        product: { status: { not: 'ARCHIVED' } }
      },
    });

    for (const v of activeVariants) {
      await this.prisma.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          variantId: v.id,
          quantity: v.stock,
          reserved: 0,
        },
      });
    }

    return { success: true };
  }

  async update(id: string, data: any) {
    if (data.isDefault) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "warehouses" SET "isDefault" = false WHERE "isDefault" = true AND id != $1`, id
      );
    }
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `"${k}" = $${i + 2}`)
      .join(', ');
    const values = Object.values(data).filter(v => v !== undefined);
    if (fields) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "warehouses" SET ${fields}, "updatedAt" = NOW() WHERE id = $1`,
        id, ...values,
      );
    }
    return this.findOne(id);
  }

  // ─── Inventory ─────────────────────────────

  async getInventory(warehouseId: string, search?: string) {
    let sql = `
      SELECT wi.*, 
        pv.sku, pv.size, pv.color, pv.stock as "globalStock",
        p.name as "productName", p.images as "productImages",
        p.slug as "productSlug", p.id as "productId", p."categoryId"
      FROM "warehouse_inventory" wi
      JOIN "product_variants" pv ON pv.id = wi."variantId"
      JOIN "products" p ON p.id = pv."productId"
      WHERE wi."warehouseId" = $1
    `;
    const params: any[] = [warehouseId];
    if (search) {
      sql += ` AND (p.name ILIKE $2 OR pv.sku ILIKE $2)`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY p.name, pv.size`;
    return this.prisma.$queryRawUnsafe<any[]>(sql, ...params);
  }

  async updateInventory(warehouseId: string, variantId: string, quantity: number) {
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "warehouse_inventory" WHERE "warehouseId" = $1 AND "variantId" = $2`,
      warehouseId, variantId,
    );
    if (existing.length) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "warehouse_inventory" SET "quantity" = $3, "updatedAt" = NOW() 
         WHERE "warehouseId" = $1 AND "variantId" = $2`,
        warehouseId, variantId, quantity,
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "warehouse_inventory" ("id","warehouseId","variantId","quantity","reserved","updatedAt")
         VALUES (gen_random_uuid(),$1,$2,$3,0,NOW())`,
        warehouseId, variantId, quantity,
      );
    }

    // Sync manual adjustments to global product variants stock
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: quantity },
    });

    return { success: true };
  }

  // ─── Pick List ─────────────────────────────

  async getPickList(warehouseId: string) {
    const orders = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        o.id as "orderId", o."orderNumber", o.status,
        o."createdAt" as "orderDate",
        u.name as "customerName", u.phone as "customerPhone",
        a.line1, a.city, a.pincode,
        json_agg(json_build_object(
          'itemId', oi.id,
          'productName', oi."productName",
          'sku', oi.sku,
          'size', oi."variantInfo"->>'size',
          'color', oi."variantInfo"->>'color',
          'quantity', oi.quantity,
          'imageUrl', oi."imageUrl",
          'isPicked', oi."isPicked"
        ) ORDER BY oi."productName") as items
      FROM "orders" o
      JOIN "order_items" oi ON oi."orderId" = o.id
      JOIN "users" u ON u.id = o."userId"
      JOIN "addresses" a ON a.id = o."addressId"
      WHERE o."warehouseId" = $1 
        AND o.status IN ('INVENTORY_RESERVED', 'PROCESSING', 'PICKING')
      GROUP BY o.id, u.name, u.phone, a.line1, a.city, a.pincode
      ORDER BY o."createdAt" ASC
    `, warehouseId);
    return orders;
  }

  async markItemPicked(itemId: string, isPicked: boolean) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "order_items" SET "isPicked" = $2, "pickedAt" = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $1`,
      itemId, isPicked,
    );
    return { success: true };
  }

  // ─── Packing Queue ─────────────────────────

  async getPackingQueue(warehouseId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        o.id as "orderId", o."orderNumber", o.status,
        u.name as "customerName",
        a.city, a.pincode,
        json_agg(json_build_object(
          'itemId', oi.id,
          'productName', oi."productName",
          'sku', oi.sku,
          'size', oi."variantInfo"->>'size',
          'quantity', oi.quantity,
          'isPicked', oi."isPicked",
          'isPacked', oi."isPacked"
        )) as items,
        COUNT(oi.id) as "totalItems",
        SUM(CASE WHEN oi."isPicked" THEN 1 ELSE 0 END) as "pickedCount"
      FROM "orders" o
      JOIN "order_items" oi ON oi."orderId" = o.id
      JOIN "users" u ON u.id = o."userId"
      JOIN "addresses" a ON a.id = o."addressId"
      WHERE o."warehouseId" = $1 
        AND o.status IN ('PICKING', 'PACKED', 'READY_FOR_SHIPMENT')
      GROUP BY o.id, u.name, a.city, a.pincode
      HAVING SUM(CASE WHEN oi."isPicked" THEN 1 ELSE 0 END) = COUNT(oi.id)
      ORDER BY o."createdAt" ASC
    `, warehouseId);
  }

  async markItemPacked(itemId: string, isPacked: boolean) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "order_items" SET "isPacked" = $2, "packedAt" = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $1`,
      itemId, isPacked,
    );
    return { success: true };
  }

  // ─── Stats ─────────────────────────────────

  async getDashboardStats(warehouseId: string) {
    const [stats] = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(CASE WHEN status = 'INVENTORY_RESERVED' THEN 1 END)::int as "pendingPick",
        COUNT(CASE WHEN status = 'PICKING' THEN 1 END)::int as "inPicking",
        COUNT(CASE WHEN status = 'PACKED' THEN 1 END)::int as "packed",
        COUNT(CASE WHEN status = 'READY_FOR_SHIPMENT' THEN 1 END)::int as "readyForShipment",
        COUNT(CASE WHEN status = 'SHIPPED' THEN 1 END)::int as "shipped",
        COUNT(CASE WHEN DATE("createdAt") = CURRENT_DATE THEN 1 END)::int as "todayOrders"
      FROM "orders"
      WHERE "warehouseId" = $1
        AND status NOT IN ('CANCELLED','DELIVERED','REFUNDED')
    `, warehouseId);

    const [invStats] = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(*)::int as "totalVariants",
        SUM(quantity)::int as "totalUnits",
        COUNT(CASE WHEN quantity <= 5 THEN 1 END)::int as "lowStockCount"
      FROM "warehouse_inventory"
      WHERE "warehouseId" = $1
    `, warehouseId);

    return { ...stats, ...invStats };
  }
}
