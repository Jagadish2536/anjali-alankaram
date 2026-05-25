import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import axios from 'axios';

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

    // Send WhatsApp notification if user has a phone number
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    });

    if (user?.phone) {
      let templateName = '';
      let params: string[] = [];
      const userName = user.name || 'Customer';

      switch (type) {
        case 'ORDER_PLACED':
          templateName = this.config.get('MSG91_WHATSAPP_ORDER_PLACED_TEMPLATE') || 'anjali_order_placed';
          params = [userName, orderNumber];
          break;
        case 'ORDER_SHIPPED':
          templateName = this.config.get('MSG91_WHATSAPP_ORDER_SHIPPED_TEMPLATE') || 'anjali_order_shipped';
          params = [userName, orderNumber];
          break;
        case 'ORDER_DELIVERED':
          templateName = this.config.get('MSG91_WHATSAPP_ORDER_DELIVERED_TEMPLATE') || 'anjali_order_delivered';
          params = [userName, orderNumber];
          break;
        case 'ORDER_CANCELLED':
          templateName = this.config.get('MSG91_WHATSAPP_ORDER_CANCELLED_TEMPLATE') || 'anjali_order_cancelled';
          params = [userName, orderNumber];
          break;
      }

      if (templateName) {
        await this.sendWhatsAppMessage(user.phone, templateName, params);
      }
    }

    // Send push notification
    if (this.firebaseInitialized) {
      const userWithFcm = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      if (userWithFcm?.fcmToken) {
        try {
          await admin.messaging().send({
            token: userWithFcm.fcmToken,
            notification: { title, body },
            data: { orderId, type },
          });
        } catch (error) {
          this.logger.error(`Failed to send push notification to user ${userId}`, error.message);
        }
      }
    }
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100, // safety limit
    });
  }

  async markAsRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async sendAdminAlert(type: 'CUSTOMER_SIGNUP' | 'ORDER_PLACED' | 'LOW_STOCK', data: any) {
    const settings = await this.prisma.storeSettings.findFirst();
    
    let shouldNotify = true;
    let title = '';
    let body = '';

    if (type === 'CUSTOMER_SIGNUP') {
      shouldNotify = settings ? settings.notifyCustomerSignup : true;
      title = 'New Customer Registered 🎉';
      body = `${data.customerName || 'A customer'} (${data.customerEmail || data.customerPhone || 'no contact info'}) has signed up.`;
    } else if (type === 'ORDER_PLACED') {
      shouldNotify = settings ? settings.notifyNewOrder : true;
      title = 'New Order Placed 🛍️';
      body = `Order #${data.orderNumber} of ₹${data.totalAmount} placed by ${data.customerName || 'Customer'}.`;
    } else if (type === 'LOW_STOCK') {
      shouldNotify = settings ? settings.notifyLowStock : true;
      title = 'Low Stock Warning ⚠️';
      body = `Product "${data.productName}" (Size: ${data.size}, Color: ${data.color}) has only ${data.stock} left in stock.`;
    }

    if (!shouldNotify) return;

    // Find all admins
    const admins = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
        isActive: true,
      },
      select: { id: true, fcmToken: true },
    });

    if (admins.length === 0) return;

    // Create notification for each admin in database
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'GENERAL',
        title,
        body,
        data: data || {},
      })),
    });

    // Optionally send push notification to admins if they have an FCM token and firebase is initialized
    if (this.firebaseInitialized) {
      for (const adminUser of admins) {
        if (adminUser.fcmToken) {
          try {
            await admin.messaging().send({
              token: adminUser.fcmToken,
              notification: { title, body },
              data: { type, eventData: JSON.stringify(data) },
            });
          } catch (error) {
            this.logger.error(`Failed to send push notification to admin ${adminUser.id}`, error.message);
          }
        }
      }
    }
  }

  private async sendWhatsAppMessage(recipientPhone: string, templateName: string, parameters: string[]): Promise<void> {
    const authKey = this.config.get('MSG91_AUTH_KEY');
    const sender = this.config.get('MSG91_WHATSAPP_SENDER');

    if (!authKey || !sender || process.env.NODE_ENV === 'development') {
      this.logger.log(`[DEV] WhatsApp to ${recipientPhone} [Template: ${templateName}]: ${JSON.stringify(parameters)}`);
      return;
    }

    // Clean phone number: remove non-digits, ensure it starts with 91 for Indian numbers
    let cleanPhone = recipientPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    try {
      await axios.post(
        'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
        {
          integrated_number: sender,
          recipient_number: cleanPhone,
          content_type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en',
            },
            components: [
              {
                type: 'body',
                parameters: parameters.map((param) => ({
                  type: 'text',
                  text: param,
                })),
              },
            ],
          },
        },
        {
          headers: {
            authkey: authKey,
            'content-type': 'application/json',
          },
        },
      );
    } catch (error) {
      this.logger.error(`WhatsApp send failed to ${cleanPhone}: ${error.response?.data?.message || error.message}`);
    }
  }
}

