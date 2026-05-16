import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const serviceAccountBase64 = this.config.get('FIREBASE_SERVICE_ACCOUNT_BASE64');
    if (serviceAccountBase64 && serviceAccountBase64 !== 'base64_encoded_service_account_json') {
      try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('ascii'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.firebaseInitialized = true;
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin', error.message);
      }
    } else {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 not provided, push notifications disabled');
    }
  }

  async sendOrderNotification(userId: string, type: NotificationType, orderId: string, orderNumber: string) {
    let title = '';
    let body = '';

    switch (type) {
      case 'ORDER_PLACED':
        title = 'Order Confirmed! 🎉';
        body = `Your order #${orderNumber} has been successfully placed.`;
        break;
      case 'ORDER_SHIPPED':
        title = 'Order Shipped! 📦';
        body = `Your order #${orderNumber} is on its way.`;
        break;
      case 'ORDER_DELIVERED':
        title = 'Order Delivered! 🛍️';
        body = `Your order #${orderNumber} has been delivered. We hope you love it!`;
        break;
      case 'ORDER_CANCELLED':
        title = 'Order Cancelled ❌';
        body = `Your order #${orderNumber} has been cancelled.`;
        break;
    }

    if (!title) return;

    // Save to DB
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: { orderId, orderNumber },
      },
    });

    // Send push notification
    if (this.firebaseInitialized) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      if (user?.fcmToken) {
        try {
          await admin.messaging().send({
            token: user.fcmToken,
            notification: { title, body },
            data: { orderId, type },
          });
        } catch (error) {
          this.logger.error(`Failed to send push notification to user ${userId}`, error.message);
        }
      }
    }
  }
}
