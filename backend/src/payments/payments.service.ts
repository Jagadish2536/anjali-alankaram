import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const Razorpay = require('razorpay');
import { ShippingService } from '../shipping/shipping.service';
import { InventoryService } from '../orders/inventory.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private lastEnvMtime = 0;
  private cachedConfig: { keyId: string; keySecret: string; webhookSecret: string } | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private shippingService: ShippingService,
    private inventoryService: InventoryService,
  ) {}

  private getRazorpayConfig() {
    const envPath = path.resolve(process.cwd(), '.env');
    let shouldRead = false;
    let mtime = 0;

    try {
      if (fs.existsSync(envPath)) {
        const stat = fs.statSync(envPath);
        mtime = stat.mtimeMs;
        if (mtime !== this.lastEnvMtime || !this.cachedConfig) {
          shouldRead = true;
        }
      } else if (!this.cachedConfig) {
        shouldRead = true;
      }
    } catch {
      shouldRead = true;
    }

    if (shouldRead) {
      let keyId = '';
      let keySecret = '';
      let webhookSecret = '';

      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf-8');
          const matchId = content.match(/^RAZORPAY_KEY_ID="?([^"\n]*)"?/m);
          const matchSecret = content.match(/^RAZORPAY_KEY_SECRET="?([^"\n]*)"?/m);
          const matchWebhook = content.match(/^RAZORPAY_WEBHOOK_SECRET="?([^"\n]*)"?/m);
          
          if (matchId) keyId = matchId[1];
          if (matchSecret) keySecret = matchSecret[1];
          if (matchWebhook) webhookSecret = matchWebhook[1];
        }
      } catch (e) {
        this.logger.error(`Failed to read .env file: ${e.message}`);
      }

      if (!keyId) keyId = this.config.get('RAZORPAY_KEY_ID') || '';
      if (!keySecret) keySecret = this.config.get('RAZORPAY_KEY_SECRET') || '';
      if (!webhookSecret) webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET') || '';

      this.cachedConfig = { keyId, keySecret, webhookSecret };
      this.lastEnvMtime = mtime;
    }

    return this.cachedConfig!;
  }

  private getRazorpayClient() {
    const { keyId, keySecret } = this.getRazorpayConfig();
    if (!keyId || !keySecret) {
      throw new BadRequestException('Razorpay is not configured (keys missing)');
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createRazorpayOrder(amount: number, userId: string) {
    const client = this.getRazorpayClient();

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
    };

    try {
      return await client.orders.create(options);
    } catch (e) {
      this.logger.error(`Failed to create Razorpay order: ${e.message}`);
      throw new BadRequestException('Failed to create Razorpay order');
    }
  }

  /**
   * Verify Razorpay webhook signature and advance order status.
   * Called by Razorpay's webhook system.
   */
  async verifyWebhook(body: any, signature: string) {
    const { webhookSecret: secret } = this.getRazorpayConfig();
    if (!secret) throw new BadRequestException('Webhook secret not configured');

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSig !== signature) {
      this.logger.warn('Webhook signature mismatch — possible fraud attempt');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    this.logger.log(`Razorpay webhook: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      const order = await this.prisma.order.findFirst({
        where: { razorpayOrderId },
      });

      if (order && order.paymentStatus === 'PENDING') {
        // Log payment transaction
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "payment_transactions" ("id","orderId","type","amount","status","gateway","gatewayRef","createdAt")
           VALUES (gen_random_uuid(),$1,'CHARGE',$2,'SUCCESS','RAZORPAY',$3,NOW())`,
          order.id, paymentEntity.amount / 100, paymentEntity.id,
        );

        // Update payment record
        await this.prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            razorpayOrderId,
            razorpayPaymentId: paymentEntity.id,
            amount: paymentEntity.amount / 100,
            status: 'PAID',
            method: 'RAZORPAY',
          },
          update: {
            razorpayPaymentId: paymentEntity.id,
            status: 'PAID',
            amount: paymentEntity.amount / 100,
          },
        });

        // Advance order to PAYMENT_VERIFIED
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'PAYMENT_VERIFIED',
          },
        });

        // ✅ CRITICAL: Deduct stock now that payment is captured
        await this.inventoryService.confirm(order.id).catch((e) =>
          this.logger.error(`Inventory confirm failed after webhook payment.captured for order ${order.id}: ${e.message}`)
        );

        // Log status history
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "order_status_history" ("id","orderId","fromStatus","toStatus","actorRole","notes","metadata","createdAt")
           VALUES (gen_random_uuid(),$1,'PENDING_PAYMENT'::"OrderStatus",'PAYMENT_VERIFIED'::"OrderStatus",'WEBHOOK',
           'Payment captured by Razorpay',$2::jsonb,NOW())`,
          order.id, JSON.stringify({ razorpayPaymentId: paymentEntity.id }),
        );

        // Trigger shipment creation in background
        this.shippingService.createShipment(order.id).catch((e) =>
          this.logger.error(`Shipment creation failed: ${e.message}`)
        );
      }
    }

    if (event === 'payment.failed') {
      const paymentEntity = body.payload.payment.entity;
      const order = await this.prisma.order.findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
      });

      if (order) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "payment_transactions" ("id","orderId","type","amount","status","gateway","gatewayRef","failReason","createdAt")
           VALUES (gen_random_uuid(),$1,'CHARGE',$2,'FAILED','RAZORPAY',$3,$4,NOW())`,
          order.id, paymentEntity.amount / 100,
          paymentEntity.id, paymentEntity.error_description,
        );

        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });
      }
    }

    if (event === 'payment.refunded' || event === 'refund.created') {
      const refundEntity = body.payload.refund.entity;
      const paymentEntity = body.payload.payment.entity;

      // Look up order by Razorpay Order ID or Payment ID
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { razorpayOrderId: paymentEntity.order_id },
            { payment: { razorpayPaymentId: refundEntity.payment_id } },
          ],
        },
      });

      if (order) {
        const refundAmount = refundEntity.amount / 100;
        const targetStatus = refundAmount < Number(order.totalAmount) ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

        await this.prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            razorpayOrderId: order.razorpayOrderId || '',
            razorpayPaymentId: refundEntity.payment_id,
            refundId: refundEntity.id,
            refundAmount,
            refundedAt: new Date(),
            status: targetStatus,
            amount: Number(order.totalAmount),
            method: 'RAZORPAY',
          },
          update: {
            refundId: refundEntity.id,
            refundAmount,
            refundedAt: new Date(),
            status: targetStatus,
          },
        });

        const updateData: any = { paymentStatus: targetStatus };
        if (order.status !== 'CANCELLED' && targetStatus === 'REFUNDED') {
          updateData.status = 'CANCELLED';
        }

        await this.prisma.order.update({
          where: { id: order.id },
          data: updateData,
        });

        // Log transaction if not already logged
        const existingTx = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "payment_transactions" WHERE "gatewayRef" = $1 AND "type" = 'REFUND'`,
          refundEntity.id,
        );

        if (existingTx.length === 0) {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO "payment_transactions" ("id","orderId","type","amount","status","gateway","gatewayRef","createdAt")
             VALUES (gen_random_uuid(),$1,'REFUND',$2,'SUCCESS','RAZORPAY',$3,NOW())`,
            order.id, refundAmount, refundEntity.id,
          );
        }
      }
    }

    return { status: 'ok' };
  }

  /**
   * Verify payment on frontend callback (client-side verification).
   */
  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { keySecret } = this.getRazorpayConfig();
    if (!keySecret) throw new BadRequestException('Razorpay not configured');

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSig !== data.razorpaySignature) {
      throw new BadRequestException('Payment verification failed');
    }

    // Find and update order
    const order = await this.prisma.order.findFirst({
      where: { razorpayOrderId: data.razorpayOrderId },
    });

    if (order && order.paymentStatus === 'PENDING') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAID', status: 'PAYMENT_VERIFIED' },
      });

      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature,
          amount: Number(order.totalAmount),
          status: 'PAID',
          method: 'RAZORPAY',
        },
        update: {
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature,
          status: 'PAID',
          amount: Number(order.totalAmount),
        },
      });

      // ✅ CRITICAL: Deduct stock now that payment is verified (client-side callback)
      // The webhook may also fire confirm() but confirm() is idempotent —
      // it marks reservations isConfirmed=true and only deducts stock once.
      await this.inventoryService.confirm(order.id).catch((e) =>
        this.logger.error(`Inventory confirm failed after verifyPayment for order ${order.id}: ${e.message}`)
      );
    }

    return { verified: true, orderId: order?.id };
  }

  /**
   * Process refund via Razorpay.
   */
  async processRefund(orderId: string, amount?: number) {
    const client = this.getRazorpayClient();

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment?.razorpayPaymentId) {
      throw new BadRequestException('No payment found for this order');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    // Fallback to order total if payment amount is registered as 0 or undefined
    const finalAmount = amount || (payment.amount && Number(payment.amount) > 0 ? Number(payment.amount) : (order ? Number(order.totalAmount) : 0));

    if (finalAmount <= 0) {
      throw new BadRequestException('Cannot refund an order with amount 0');
    }

    try {
      const refundOptions: any = {};
      if (amount || finalAmount) refundOptions.amount = Math.round(finalAmount * 100);

      const refund = await client.payments.refund(
        payment.razorpayPaymentId,
        refundOptions,
      );

      const targetStatus = amount && amount < Number(payment.amount) ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

      await this.prisma.payment.update({
        where: { orderId },
        data: {
          refundId: refund.id,
          refundAmount: finalAmount,
          refundedAt: new Date(),
          status: targetStatus,
        },
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: targetStatus,
        },
      });

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "payment_transactions" ("id","orderId","type","amount","status","gateway","gatewayRef","createdAt")
         VALUES (gen_random_uuid(),$1,'REFUND',$2,'SUCCESS','RAZORPAY',$3,NOW())`,
        orderId, finalAmount, refund.id,
      );

      return refund;
    } catch (e) {
      const errMsg = e.response?.data?.error?.description || e.message || 'Unknown error';
      this.logger.error(`Refund failed for order ${orderId}: ${errMsg}`);
      
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "payment_transactions" ("id","orderId","type","amount","status","gateway","gatewayRef","failReason","createdAt")
           VALUES (gen_random_uuid(),$1,'REFUND',$2,'FAILED','RAZORPAY',$3,$4,NOW())`,
          orderId, finalAmount, payment?.razorpayPaymentId || '', errMsg
        );
      } catch (logErr) {
        this.logger.error(`Failed to log failed refund transaction: ${logErr.message}`);
      }

      throw new BadRequestException(`Refund failed: ${errMsg}`);
    }
  }

  /**
   * Get payment transaction history for an order.
   */
  async getTransactionHistory(orderId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "payment_transactions" WHERE "orderId" = $1 ORDER BY "createdAt" DESC`,
      orderId,
    );
  }

  /**
   * Get full payment details for an order including Razorpay fee/tax/settlement data.
   */
  async getPaymentDetails(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      return null;
    }

    let razorpayDetails: any = null;

    if (payment.razorpayPaymentId) {
      try {
        const client = this.getRazorpayClient();
        const rzpPayment = await client.payments.fetch(payment.razorpayPaymentId);
        // fee and tax are in paise
        const fee = Number(rzpPayment.fee || 0) / 100;
        const tax = Number(rzpPayment.tax || 0) / 100;
        const amount = Number(rzpPayment.amount || 0) / 100;
        const settled = Math.max(0, amount - fee - tax);
        razorpayDetails = {
          fee,
          tax,
          amount,
          settled,
          method: rzpPayment.method,
          bank: rzpPayment.bank || rzpPayment.wallet || rzpPayment.vpa || null,
          capturedAt: rzpPayment.created_at ? new Date(rzpPayment.created_at * 1000).toISOString() : null,
          status: rzpPayment.status,
          razorpayOrderId: rzpPayment.order_id,
        };
      } catch (e) {
        this.logger.warn(`Could not fetch Razorpay payment details for ${payment.razorpayPaymentId}: ${e.message}`);
      }
    }

    return {
      ...payment,
      razorpayDetails,
    };
  }
}
