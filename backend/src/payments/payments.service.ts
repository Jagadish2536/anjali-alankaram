import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
    };

    try {
      return await this.razorpay.orders.create(options);
    } catch (error) {
      throw new BadRequestException('Failed to create Razorpay order');
    }
  }

  async verifyWebhook(body: any, signature: string) {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook secret not configured');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      
      // Find the order that has this razorpayOrderId
      const order = await this.prisma.order.findFirst({
        where: { razorpayOrderId: orderId }
      });

      if (order && order.paymentStatus === 'PENDING') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          }
        });

        await this.prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentEntity.id,
            amount: paymentEntity.amount / 100,
            status: 'PAID',
            method: 'RAZORPAY'
          },
          update: {
            razorpayPaymentId: paymentEntity.id,
            status: 'PAID'
          }
        });
      }
    }
    return { status: 'ok' };
  }
}
