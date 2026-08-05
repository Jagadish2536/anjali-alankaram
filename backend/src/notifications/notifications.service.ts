import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
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
      case 'ORDER_CONFIRMED':
        title = 'Order Confirmed! ✅';
        body = `Your order #${orderNumber} has been confirmed and is being processed.`;
        break;
      case 'ORDER_SHIPPED':
        title = 'Order Shipped! 📦';
        body = `Your order #${orderNumber} is on its way.`;
        break;
      case 'ORDER_OUT_FOR_DELIVERY':
        title = 'Out for Delivery! 🚚';
        body = `Your order #${orderNumber} is out for delivery today.`;
        break;
      case 'ORDER_DELIVERED':
        title = 'Order Delivered! 🛍️';
        body = `Your order #${orderNumber} has been delivered. We hope you love it!`;
        break;
      case 'ORDER_CANCELLED':
        title = 'Order Cancelled ❌';
        body = `Your order #${orderNumber} has been cancelled.`;
        break;
      case 'RETURN_UPDATE':
        title = 'Return Request Update 🔄';
        body = `There is an update on your return request for order #${orderNumber}.`;
        break;
      case 'REFUND_UPDATE':
        title = 'Refund Status Update 💰';
        body = `There is an update on your refund status for order #${orderNumber}.`;
        break;
      case 'ORDER_UPDATE':
        title = 'Order In Transit 🚚';
        body = `Your order #${orderNumber} is now in transit.`;
        break;
      case 'PAYMENT_SUCCESS':
        title = 'Payment Successful! 💳';
        body = `Your payment for order #${orderNumber} was successful.`;
        break;
      case 'PAYMENT_FAILED':
        title = 'Payment Failed ❌';
        body = `The payment for order #${orderNumber} has failed.`;
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

    // Send WhatsApp order lifecycle notification via MSG91 (if enabled in user settings)
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, address: true },
      });

      const userObj = order?.user as any;
      const whatsappEnabled = userObj?.whatsappNotificationsEnabled ?? true;
      if (!whatsappEnabled) {
        this.logger.log(`Skipping WhatsApp notification for order #${orderNumber} because user has toggled WhatsApp notifications OFF`);
      } else {
        const recipientPhone = order?.address?.phone || order?.user?.phone;
        const customerName = order?.address?.name || order?.user?.name || 'Customer';
        const trackingInfo = order?.trackingUrl || order?.awbCode || order?.courierName || 'Standard Shipping';

        if (recipientPhone) {
          let templateName = '';
          let params: string[] = [];

          if (type === 'ORDER_PLACED') {
            templateName = this.config.get('MSG91_WHATSAPP_ORDER_PLACED_TEMPLATE') || 'order_placed';
            params = [customerName, orderNumber, `₹${order?.totalAmount || 0}`];
          } else if (type === 'ORDER_CONFIRMED') {
            templateName = this.config.get('MSG91_WHATSAPP_ORDER_CONFIRMED_TEMPLATE') || 'order_confirmed';
            params = [customerName, orderNumber];
          } else if (type === 'ORDER_SHIPPED' || type === 'ORDER_UPDATE') {
            // ORDER_SHIPPED and ORDER_UPDATE (In Transit)
            templateName = this.config.get('MSG91_WHATSAPP_ORDER_SHIPPED_TEMPLATE') || 'order_shipped';
            const courier = order?.courierName || 'Courier Partner';
            const awb = order?.awbCode || 'N/A';
            const trackUrl = order?.trackingUrl || (order?.awbCode ? `https://anjalialankaram.com/orders/${orderId}/track` : '');
            const courierDetails = `${courier} (AWB: ${awb})${trackUrl ? ` - Track: ${trackUrl}` : ''}. Note: Please check the official ${courier} website for live tracking updates.`;
            params = [customerName, orderNumber, courierDetails];
          } else if (type === 'ORDER_OUT_FOR_DELIVERY') {
            templateName = this.config.get('MSG91_WHATSAPP_ORDER_OUT_FOR_DELIVERY_TEMPLATE') || this.config.get('MSG91_WHATSAPP_ORDER_SHIPPED_TEMPLATE') || 'order_out_for_delivery';
            const courier = order?.courierName || 'Courier Partner';
            const awb = order?.awbCode || 'N/A';
            const trackUrl = order?.trackingUrl || (order?.awbCode ? `https://anjalialankaram.com/orders/${orderId}/track` : '');
            const courierDetails = `${courier} (AWB: ${awb})${trackUrl ? ` - Track: ${trackUrl}` : ''}. Note: Please check the official ${courier} website for live tracking updates.`;
            params = [customerName, orderNumber, courierDetails];
          } else if (type === 'ORDER_DELIVERED') {
            templateName = this.config.get('MSG91_WHATSAPP_ORDER_DELIVERED_TEMPLATE') || 'order_delivered';
            params = [customerName, orderNumber];
          }

          if (templateName) {
            this.sendWhatsAppMessage(recipientPhone, templateName, params).catch((err) =>
              this.logger.error(`Failed to send WhatsApp notification for order #${orderNumber}: ${err.message}`),
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to trigger WhatsApp order notification: ${err.message}`);
    }

    // Send push notification
    if (this.firebaseInitialized) {
      const userWithFcm = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      if (userWithFcm?.fcmToken) {
        try {
          await this.notificationsQueue.add(
            'sendPush',
            {
              token: userWithFcm.fcmToken,
              title,
              body,
              data: { orderId, type },
            },
            {
              attempts: 3,
              backoff: 5000,
              removeOnComplete: true,
            },
          );
        } catch (error: any) {
          this.logger.error(`Failed to enqueue push notification to user ${userId}: ${error.message}`);
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

  async sendAdminAlert(
    type: 'CUSTOMER_SIGNUP' | 'ORDER_PLACED' | 'LOW_STOCK' | 'OUT_OF_STOCK',
    data: any,
  ) {
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

      // Prevent duplicate ORDER_PLACED alert for the same orderId
      if (data.orderId) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            title: 'New Order Placed 🛍️',
            data: { path: ['orderId'], equals: data.orderId },
          },
        });
        if (existing) return;
      }
    } else if (type === 'LOW_STOCK') {
      shouldNotify = settings ? settings.notifyLowStock : true;
      title = 'Low Stock Warning ⚠️';
      const prodIdStr = data.productId ? `Product ID: ${data.productId} · ` : '';
      const details = [
        data.size ? `Size: ${data.size}` : null,
        data.color ? `Color: ${data.color}` : null,
        data.sku ? `SKU: ${data.sku}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      body = `${prodIdStr}"${data.productName}"${details ? ` (${details})` : ''} has only ${data.stock} item(s) remaining in stock.`;

      // Prevent spamming low stock alert within 1 hour for the same variant
      if (data.variantId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existing = await this.prisma.notification.findFirst({
          where: {
            title: 'Low Stock Warning ⚠️',
            createdAt: { gte: oneHourAgo },
            data: { path: ['variantId'], equals: data.variantId },
          },
        });
        if (existing) return;
      }
    } else if (type === 'OUT_OF_STOCK') {
      shouldNotify = settings ? settings.notifyLowStock : true;
      title = 'Out of Stock Alert 🔴';
      const prodIdStr = data.productId ? `Product ID: ${data.productId} · ` : '';
      const details = [
        data.size ? `Size: ${data.size}` : null,
        data.color ? `Color: ${data.color}` : null,
        data.sku ? `SKU: ${data.sku}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      body = `${prodIdStr}"${data.productName}"${details ? ` (${details})` : ''} is now OUT OF STOCK (Stock: 0).`;

      // Prevent spamming out of stock alert within 1 hour for the same variant
      if (data.variantId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existing = await this.prisma.notification.findFirst({
          where: {
            title: 'Out of Stock Alert 🔴',
            createdAt: { gte: oneHourAgo },
            data: { path: ['variantId'], equals: data.variantId },
          },
        });
        if (existing) return;
      }
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
            await this.notificationsQueue.add(
              'sendPush',
              {
                token: adminUser.fcmToken,
                title,
                body,
                data: { type, eventData: JSON.stringify(data) },
              },
              {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
              },
            );
          } catch (error: any) {
            this.logger.error(`Failed to enqueue push notification to admin ${adminUser.id}: ${error.message}`);
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

