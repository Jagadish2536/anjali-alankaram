import { Controller, Get, Post, Body, UseGuards, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PaymentsService } from '../payments/payments.service';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

@Controller('settings')
export class SettingsController {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private paymentsService: PaymentsService,
  ) {}

  @Get()
  async getSettings() {
    let settings = await this.prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.storeSettings.create({
        data: {
          storeName: 'Anjali Alankaram',
          supportEmail: 'support@anjalialankaram.com',
          supportPhone: '+91 9876543210'
        }
      });
    }
    return settings;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateSettings(@Body() data: any) {
    // Only pass fields that exist in the StoreSettings schema
    const {
      storeName, supportEmail, supportPhone, whatsappNumber, instagramUrl,
      maintenanceMode, require2FA,
      notifyNewOrder, notifyLowStock, notifyCustomerSignup,
      currency, currencySymbol, gstEnabled, gstRate,
      freeShippingThreshold, shippingEnabled, shippingCharge, codEnabled, codCharges,
      couponsEnabled, giftEnabled, giftAmount,
      platformFeeEnabled, platformFeeAmount,
      lowStockThreshold, reservationTimeoutMins,
      storeDescription, storeAddress, businessHours, contactEmail, contactPhone,
      returnPolicyDays, footerCategories,
      marqueeText, heroImageUrl, heroLeftImageUrl, heroTitle, heroSubtitle,
      bankName, accountNumber, ifscCode, accountHolderName,
    } = data;

    // Build clean payload with only defined values (skip undefined)
    const cleanData: any = {};
    const safe = (key: string, val: any) => { if (val !== undefined) cleanData[key] = val; };

    safe('storeName', storeName);
    safe('supportEmail', supportEmail);
    safe('supportPhone', supportPhone);
    safe('whatsappNumber', whatsappNumber);
    safe('instagramUrl', instagramUrl);
    safe('maintenanceMode', maintenanceMode !== undefined ? Boolean(maintenanceMode) : undefined);
    safe('require2FA', require2FA !== undefined ? Boolean(require2FA) : undefined);
    safe('notifyNewOrder', notifyNewOrder !== undefined ? Boolean(notifyNewOrder) : undefined);
    safe('notifyLowStock', notifyLowStock !== undefined ? Boolean(notifyLowStock) : undefined);
    safe('notifyCustomerSignup', notifyCustomerSignup !== undefined ? Boolean(notifyCustomerSignup) : undefined);
    safe('currency', currency);
    safe('currencySymbol', currencySymbol);
    safe('gstEnabled', gstEnabled !== undefined ? Boolean(gstEnabled) : undefined);
    safe('gstRate', gstRate != null ? Number(gstRate) : undefined);
    safe('freeShippingThreshold', freeShippingThreshold != null ? Number(freeShippingThreshold) : undefined);
    safe('shippingEnabled', shippingEnabled !== undefined ? Boolean(shippingEnabled) : undefined);
    safe('shippingCharge', shippingCharge != null ? Number(shippingCharge) : undefined);
    safe('codEnabled', codEnabled !== undefined ? Boolean(codEnabled) : undefined);
    safe('codCharges', codCharges != null ? Number(codCharges) : undefined);
    safe('couponsEnabled', couponsEnabled !== undefined ? Boolean(couponsEnabled) : undefined);
    safe('giftEnabled', giftEnabled !== undefined ? Boolean(giftEnabled) : undefined);
    safe('giftAmount', giftAmount != null ? Number(giftAmount) : undefined);
    safe('platformFeeEnabled', platformFeeEnabled !== undefined ? Boolean(platformFeeEnabled) : undefined);
    safe('platformFeeAmount', platformFeeAmount != null ? Number(platformFeeAmount) : undefined);
    safe('lowStockThreshold', lowStockThreshold != null ? Number(lowStockThreshold) : undefined);
    safe('reservationTimeoutMins', reservationTimeoutMins != null ? Number(reservationTimeoutMins) : undefined);
    safe('storeDescription', storeDescription);
    safe('storeAddress', storeAddress);
    safe('businessHours', businessHours);
    safe('contactEmail', contactEmail);
    safe('contactPhone', contactPhone);
    safe('returnPolicyDays', returnPolicyDays != null ? Number(returnPolicyDays) : undefined);
    safe('footerCategories', footerCategories);
    safe('marqueeText', marqueeText);
    safe('heroImageUrl', heroImageUrl);
    safe('heroLeftImageUrl', heroLeftImageUrl);
    safe('heroTitle', heroTitle);
    safe('heroSubtitle', heroSubtitle);
    safe('bankName', bankName);
    safe('accountNumber', accountNumber);
    safe('ifscCode', ifscCode);
    safe('accountHolderName', accountHolderName);

    const settings = await this.prisma.storeSettings.findFirst();

    if (settings) {
      return this.prisma.storeSettings.update({
        where: { id: settings.id },
        data: cleanData,
      });
    } else {
      return this.prisma.storeSettings.create({ data: cleanData });
    }
  }

  // ── Payment config (reads/writes DB & .env file fallback) ────────────────

  @Get('payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPaymentConfig() {
    // 1. First fetch from database
    const settings = await this.prisma.storeSettings.findFirst();
    let dbKeyId = settings?.razorpayKeyId || '';
    let dbKeySecret = settings?.razorpayKeySecret || '';
    let dbWebhookSecret = settings?.razorpayWebhookSecret || '';

    // 2. Fall back to env file or process.env field-by-field if database fields are empty
    if (!dbKeyId || !dbKeySecret || !dbWebhookSecret) {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch {}

      const get = (key: string) => {
        const match = envContent.match(new RegExp(`^${key}="?([^"\n]*)"?`, 'm'));
        return match ? match[1] : (process.env[key] || '');
      };

      if (!dbKeyId) dbKeyId = get('RAZORPAY_KEY_ID');
      if (!dbKeySecret) dbKeySecret = get('RAZORPAY_KEY_SECRET');
      if (!dbWebhookSecret) dbWebhookSecret = get('RAZORPAY_WEBHOOK_SECRET');
    }

    return {
      razorpayKeyId: dbKeyId,
      razorpayKeySecret: dbKeySecret ? '••••••••••••••••' : '',
      razorpayWebhookSecret: dbWebhookSecret ? '••••••••••••••••' : '',
      razorpayEnabled: !!(dbKeyId && !dbKeyId.includes('your_')),
    };
  }

  @Post('payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updatePaymentConfig(@Body() body: {
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    razorpayWebhookSecret?: string;
  }) {
    // 1. Save to Database
    let settings = await this.prisma.storeSettings.findFirst();
    const updateData: any = {};
    if (body.razorpayKeyId !== undefined) {
      updateData.razorpayKeyId = body.razorpayKeyId;
    }
    if (body.razorpayKeySecret !== undefined && !body.razorpayKeySecret.includes('•')) {
      updateData.razorpayKeySecret = body.razorpayKeySecret;
    }
    if (body.razorpayWebhookSecret !== undefined && !body.razorpayWebhookSecret.includes('•')) {
      updateData.razorpayWebhookSecret = body.razorpayWebhookSecret;
    }

    if (settings) {
      await this.prisma.storeSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      await this.prisma.storeSettings.create({
        data: {
          storeName: 'Anjali Alankaram',
          ...updateData,
        },
      });
    }

    // 2. Update process.env variables in memory for immediate use
    if (body.razorpayKeyId) {
      process.env.RAZORPAY_KEY_ID = body.razorpayKeyId;
    }
    if (body.razorpayKeySecret && !body.razorpayKeySecret.includes('•')) {
      process.env.RAZORPAY_KEY_SECRET = body.razorpayKeySecret;
    }
    if (body.razorpayWebhookSecret && !body.razorpayWebhookSecret.includes('•')) {
      process.env.RAZORPAY_WEBHOOK_SECRET = body.razorpayWebhookSecret;
    }

    // 3. Trigger paymentsService to refresh its cache
    await this.paymentsService.refreshConfig();

    // 4. Also write to local .env if it exists for development convenience
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      try {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        const setKey = (content: string, key: string, value: string | undefined) => {
          if (!value || value.includes('•')) return content; // skip masked placeholders
          const regex = new RegExp(`^(${key}=).*$`, 'm');
          const newLine = `${key}="${value}"`;
          return regex.test(content) ? content.replace(regex, newLine) : content + `\n${newLine}`;
        };
        let updated = envContent;
        updated = setKey(updated, 'RAZORPAY_KEY_ID', body.razorpayKeyId);
        updated = setKey(updated, 'RAZORPAY_KEY_SECRET', body.razorpayKeySecret);
        updated = setKey(updated, 'RAZORPAY_WEBHOOK_SECRET', body.razorpayWebhookSecret);
        fs.writeFileSync(envPath, updated, 'utf-8');
      } catch (e) {
        // ignore
      }
    }

    return { success: true, message: 'Payment configuration saved successfully.' };
  }

  // ── Contact form ─────────────────────────────────────────────────────────

  @Post('contact')
  async sendContactForm(@Body() body: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const settings = await this.prisma.storeSettings.findFirst();
    const recipientEmail = (settings as any)?.contactEmail || (settings as any)?.supportEmail || 'support@anjalialankaram.com';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#FDF5EC;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDF5EC;padding:30px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
              <tr>
                <td style="background:#8B0030;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;color:#FDF5EC;font-size:22px;letter-spacing:1px;">New Contact Form Enquiry</h1>
                  <p style="margin:4px 0 0;color:#f0c8d0;font-size:13px;">Anjali Alankaram — Website</p>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;padding:36px 40px;">
                  <h2 style="color:#8B0030;margin:0 0 8px;">${body.subject || 'General Enquiry'}</h2>
                  <p style="color:#555;margin:0 0 20px;font-size:14px;">From: <strong>${body.firstName} ${body.lastName}</strong> &lt;${body.email}&gt;</p>
                  <div style="background:#FDF5EC;border-left:4px solid #8B0030;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px;">
                    <p style="margin:0;color:#333;font-size:15px;line-height:1.7;white-space:pre-wrap;">${body.message}</p>
                  </div>
                  <p style="color:#888;font-size:13px;margin:0;">Reply directly to this email to respond to the customer.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#1a1a1a;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;">
                  <p style="margin:0;color:#888;font-size:12px;">&copy; 2025 Anjali Alankaram</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`;

    try {
      // Use the private send method pattern — forward email to store's support address
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-south-2' });
      await ses.send(new SendEmailCommand({
        Source: `Anjali Alankaram <${process.env.SES_FROM_EMAIL || 'noreply@anjalialankaram.com'}>`,
        Destination: { ToAddresses: [recipientEmail] },
        ReplyToAddresses: [body.email],
        Message: {
          Subject: { Data: `[Contact Form] ${body.subject || 'New Enquiry'} — from ${body.firstName} ${body.lastName}`, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      }));
      return { success: true, message: 'Your message has been sent! We will get back to you within 24 hours.' };
    } catch (e) {
      // Silently fail — log but return success to not expose infra details
      console.error('Contact form email failed:', e.message);
      return { success: true, message: 'Your message has been sent! We will get back to you within 24 hours.' };
    }
  }

  // ── Public visitor ping ───────────────────────────────────────────────────────
  // Called by every frontend page every 30s. No authentication required.
  @Post('visitor-ping')
  async visitorPing(@Body() body: { visitorId: string; page?: string }) {
    const { visitorId, page = '/' } = body;
    if (!visitorId) return { ok: false };

    const siteKey = 'site:live-visitors';
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000; // 5-minute window matches admin dashboard
    // member encodes both visitor and page so we can compute per-page breakdown
    const member = `${visitorId}|${page}`;

    try {
      // Remove stale entries for this visitor across any page they were on before
      const existing = await this.redis.zrange(siteKey, 0, -1);
      const staleKeys = existing.filter((m) => m.startsWith(`${visitorId}|`));
      if (staleKeys.length > 0) {
        await this.redis.zrem(siteKey, ...staleKeys);
      }
      // Add fresh entry with current timestamp
      await this.redis.zadd(siteKey, now, member);
      // Prune all expired (> 5 min old) entries
      await this.redis.zremrangebyscore(siteKey, '-inf', fiveMinAgo);
      // Keep TTL alive (10 min)
      await this.redis.expire(siteKey, 600);
    } catch { /* graceful — Redis may be temporarily unavailable */ }

    return { ok: true };
  }

  @Post('temp-prune-db-prod')
  async tempPruneDb(@Body() body: { secret: string }) {
    if (body.secret !== 'anjali-alankaram-prune-2026-fresh-start') {
      throw new BadRequestException('Unauthorized');
    }

    const adminEmail = 'jagadshvarma99@gmail.com';
    const adminUser = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (adminUser) {
      await this.prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'SUPER_ADMIN' }
      });
    } else {
      await this.prisma.user.create({
        data: {
          email: adminEmail,
          role: 'SUPER_ADMIN',
          name: 'Jagadish Varma',
          isPhoneVerified: false,
          isEmailVerified: true,
          isActive: true
        }
      });
    }

    const preservedAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });
    const adminId = preservedAdmin.id;

    // Prune order/payments
    await this.prisma.orderStatusHistory.deleteMany({});
    await this.prisma.paymentTransaction.deleteMany({});
    await this.prisma.payment.deleteMany({});
    await this.prisma.orderItem.deleteMany({});
    await this.prisma.inventoryReservation.deleteMany({});
    await this.prisma.order.deleteMany({});

    // Carts / wishlists
    await this.prisma.cartItem.deleteMany({});
    await this.prisma.cart.deleteMany({});
    await this.prisma.wishlistItem.deleteMany({});
    await this.prisma.wishlist.deleteMany({});

    // Reviews, logs, notify
    await this.prisma.review.deleteMany({});
    await this.prisma.notification.deleteMany({});
    await this.prisma.inventoryLog.deleteMany({});
    await this.prisma.warehouseInventory.deleteMany({});

    // Catalog items
    await this.prisma.productVariant.deleteMany({});
    await this.prisma.product.deleteMany({});
    await this.prisma.category.deleteMany({});
    await this.prisma.coupon.deleteMany({});
    await this.prisma.banner.deleteMany({});

    // OTP / Tokens
    await this.prisma.otpCode.deleteMany({});
    await this.prisma.address.deleteMany({ where: { userId: { not: adminId } } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: { not: adminId } } });

    // Users
    await this.prisma.user.deleteMany({ where: { id: { not: adminId } } });

    return { success: true, message: 'Database pruned successfully. Admin user preserved.' };
  }
}
