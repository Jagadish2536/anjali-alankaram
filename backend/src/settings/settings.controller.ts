import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

@Controller('settings')
export class SettingsController {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(REDIS_CLIENT) private redis: Redis,
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
    safe('maintenanceMode', maintenanceMode);
    safe('require2FA', require2FA);
    safe('notifyNewOrder', notifyNewOrder);
    safe('notifyLowStock', notifyLowStock);
    safe('notifyCustomerSignup', notifyCustomerSignup);
    safe('currency', currency);
    safe('currencySymbol', currencySymbol);
    safe('gstEnabled', gstEnabled);
    safe('gstRate', gstRate != null ? Number(gstRate) : undefined);
    safe('freeShippingThreshold', freeShippingThreshold != null ? Number(freeShippingThreshold) : undefined);
    safe('shippingEnabled', shippingEnabled);
    safe('shippingCharge', shippingCharge != null ? Number(shippingCharge) : undefined);
    safe('codEnabled', codEnabled);
    safe('codCharges', codCharges != null ? Number(codCharges) : undefined);
    safe('couponsEnabled', couponsEnabled);
    safe('giftEnabled', giftEnabled);
    safe('giftAmount', giftAmount != null ? Number(giftAmount) : undefined);
    safe('platformFeeEnabled', platformFeeEnabled);
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

  // ── Payment config (reads/writes .env file) ──────────────────────────────

  @Get('payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPaymentConfig() {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch {}

    const get = (key: string) => {
      const match = envContent.match(new RegExp(`^${key}="?([^"\n]*)"?`, 'm'));
      return match ? match[1] : '';
    };

    return {
      razorpayKeyId: get('RAZORPAY_KEY_ID'),
      razorpayKeySecret: get('RAZORPAY_KEY_SECRET') ? '••••••••••••••••' : '',
      razorpayWebhookSecret: get('RAZORPAY_WEBHOOK_SECRET') ? '••••••••••••••••' : '',
      razorpayEnabled: !!(get('RAZORPAY_KEY_ID') && !get('RAZORPAY_KEY_ID').includes('your_')),
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
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch {}

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

    try {
      fs.writeFileSync(envPath, updated, 'utf-8');
    } catch (e) {
      return { success: false, message: 'Failed to write .env file' };
    }

    return { success: true, message: 'Payment configuration saved. Restart the server to apply new keys.' };
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
}
