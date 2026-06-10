import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const Razorpay = require('razorpay');
import { ShippingService } from '../shipping/shipping.service';
import { InventoryService } from '../orders/inventory.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private cachedConfig: { keyId: string; keySecret: string; webhookSecret: string } | null = null;
  private lastCacheTime = 0;
  private readonly CACHE_TTL = 10000; // 10 seconds cache TTL

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private shippingService: ShippingService,
    private inventoryService: InventoryService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  private async sendOrderConfirmationDetails(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          user: true,
          address: true,
        },
      });
      if (!order) return;

      // 1. Send customer notification
      await this.notificationsService
        .sendOrderNotification(order.userId, 'ORDER_PLACED', order.id, order.orderNumber)
        .catch(() => {});

      // 2. Send email confirmation
      if (order.user?.email) {
        await this.emailService.sendOrderConfirmation(order.user.email, {
          customerName: order.user.name || 'Customer',
          orderNumber: order.orderNumber,
          items: order.items.map((i: any) => ({
            name: i.productName,
            size: (i.variantInfo as any)?.size || '',
            qty: i.quantity,
            price: Number(i.unitPrice),
          })),
          subtotal: Number(order.subtotal),
          discount: Number(order.discountAmount),
          shipping: Number(order.shippingCharge),
          total: Number(order.totalAmount),
          paymentMethod: order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment',
          address: order.address
            ? `${order.address.name}, ${order.address.line1}, ${order.address.city} - ${order.address.pincode}`
            : 'N/A',
        }).catch(() => {});
      }
    } catch (e) {
      this.logger.error(`Failed to send order confirmation details: ${e.message}`);
    }
  }

  async onModuleInit() {
    await this.getRazorpayConfig();
  }

  async refreshConfig() {
    this.cachedConfig = null;
    this.lastCacheTime = 0;
    await this.getRazorpayConfig();
  }

  private async getRazorpayConfig() {
    const now = Date.now();
    if (this.cachedConfig && (now - this.lastCacheTime < this.CACHE_TTL)) {
      return this.cachedConfig;
    }

    let keyId = '';
    let keySecret = '';
    let webhookSecret = '';

    try {
      const settings = await this.prisma.storeSettings.findFirst();
      if (settings) {
        keyId = settings.razorpayKeyId || '';
        keySecret = settings.razorpayKeySecret || '';
        webhookSecret = settings.razorpayWebhookSecret || '';
      }
    } catch (e) {
      this.logger.error(`Failed to read Razorpay config from database: ${e.message}`);
    }

    // Fallback to env file or process.env if database fields are missing/empty (field-by-field)
    if (!keyId || !keySecret || !webhookSecret) {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      try {
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf-8');
        }
      } catch (e) {
        this.logger.error(`Failed to read .env file: ${e.message}`);
      }

      const getFromEnv = (key: string) => {
        if (envContent) {
          const match = envContent.match(new RegExp(`^${key}="?([^"\n]*)"?`, 'm'));
          if (match) return match[1];
        }
        return this.config.get(key) || '';
      };

      if (!keyId) keyId = getFromEnv('RAZORPAY_KEY_ID');
      if (!keySecret) keySecret = getFromEnv('RAZORPAY_KEY_SECRET');
      if (!webhookSecret) webhookSecret = getFromEnv('RAZORPAY_WEBHOOK_SECRET');
    }

    this.cachedConfig = { keyId, keySecret, webhookSecret };
    this.lastCacheTime = now;
    return this.cachedConfig;
  }

  private async getRazorpayClient() {
    const { keyId, keySecret } = await this.getRazorpayConfig();
    if (!keyId || !keySecret) {
      throw new BadRequestException('Razorpay is not configured (keys missing)');
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  /** Public accessor — lets AdminController call Razorpay API directly */
  async getPublicConfig() {
    return this.getRazorpayConfig();
  }

  /** Public accessor — returns null if keys are missing (no throw) */
  async getPublicRazorpayClient() {
    try { return await this.getRazorpayClient(); } catch { return null; }
  }

  async createRazorpayOrder(amount: number, userId: string) {
    const client = await this.getRazorpayClient();

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
   * rawBody must be the exact bytes received — NOT re-serialized JSON.
   */
  async verifyWebhook(rawBody: Buffer, body: any, signature: string) {
    const { webhookSecret: secret } = await this.getRazorpayConfig();
    if (!secret) throw new BadRequestException('Webhook secret not configured');

    // Verify HMAC signature using raw bytes (re-serializing breaks key order/spacing)
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
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

        // Clear cart for the user who placed this order
        try {
          const userCart = await this.prisma.cart.findUnique({ where: { userId: order.userId } });
          if (userCart) {
            await this.prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });
          }
        } catch (e) {
          this.logger.error(`Failed to clear cart after webhook payment.captured for order ${order.id}: ${e.message}`);
        }

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

        // Send order confirmation email and notification post-payment
        await this.sendOrderConfirmationDetails(order.id);
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

        // Trigger customer refund email
        const user = await this.prisma.user.findUnique({
          where: { id: order.userId },
          select: { email: true, name: true },
        });
        if (user?.email) {
          this.emailService.sendOrderRefunded(user.email, {
            customerName: user.name || 'Customer',
            orderNumber: order.orderNumber,
            amount: refundAmount,
            status: targetStatus === 'PARTIALLY_REFUNDED' ? 'REFUND_INITIATED' : 'REFUNDED',
          }).catch((err) => this.logger.error(`Failed to send refund email: ${err.message}`));
        }

        // Trigger customer push/WhatsApp notification
        await this.notificationsService
          .sendOrderNotification(order.userId, 'REFUND_UPDATE', order.id, order.orderNumber)
          .catch(() => {});
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
    const { keySecret } = await this.getRazorpayConfig();
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

      // Clear cart for the user who placed this order
      try {
        const userCart = await this.prisma.cart.findUnique({ where: { userId: order.userId } });
        if (userCart) {
          await this.prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });
        }
      } catch (e) {
        this.logger.error(`Failed to clear cart after verifyPayment for order ${order.id}: ${e.message}`);
      }

      // Log status history
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "order_status_history" ("id","orderId","fromStatus","toStatus","actorRole","notes","metadata","createdAt")
         VALUES (gen_random_uuid(),$1,'PENDING_PAYMENT'::"OrderStatus",'PAYMENT_VERIFIED'::"OrderStatus",'CUSTOMER',
         'Payment verified via client callback',$2::jsonb,NOW())`,
        order.id, JSON.stringify({ razorpayPaymentId: data.razorpayPaymentId }),
      );

      // Send order confirmation email and notification post-payment
      await this.sendOrderConfirmationDetails(order.id);
    }

    return { verified: true, orderId: order?.id };
  }

  /**
   * Process refund via Razorpay.
   */
  async processRefund(orderId: string, amount?: number) {
    const client = await this.getRazorpayClient();

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
        const client = await this.getRazorpayClient();
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
