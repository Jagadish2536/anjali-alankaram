import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');
import { ShippingService } from '../shipping/shipping.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private shippingService: ShippingService,
  ) {
    const key_id = this.config.get('RAZORPAY_KEY_ID');
    const key_secret = this.config.get('RAZORPAY_KEY_SECRET');
    if (key_id && key_secret) {
      this.razorpay = new Razorpay({ key_id, key_secret });
    }
  }

  async createRazorpayOrder(amount: number, userId: string) {
    if (!this.razorpay) throw new BadRequestException('Razorpay is not configured');

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
    };

    try {
      return await this.razorpay.orders.create(options);
    } catch {
      throw new BadRequestException('Failed to create Razorpay order');
    }
  }

  /**
   * Verify Razorpay webhook signature and advance order status.
   * Called by Razorpay's webhook system.
   */
  async verifyWebhook(body: any, signature: string) {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
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

        // Advance order to PAYMENT_VERIFIED → CONFIRMED → INVENTORY_RESERVED
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'PAYMENT_VERIFIED',
          },
        });

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
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET');
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
    }

    return { verified: true, orderId: order?.id };
  }

  /**
   * Process refund via Razorpay.
   */
  async processRefund(orderId: string, amount?: number) {
    if (!this.razorpay) throw new BadRequestException('Razorpay not configured');

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

      const refund = await this.razorpay.payments.refund(
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
}
