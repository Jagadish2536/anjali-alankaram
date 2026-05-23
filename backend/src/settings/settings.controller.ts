import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import * as fs from 'fs';
import * as path from 'path';

@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

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
      freeShippingThreshold, shippingCharge, codEnabled, codCharges,
      couponsEnabled, giftEnabled, giftAmount,
      platformFeeEnabled, platformFeeAmount,
      lowStockThreshold, reservationTimeoutMins,
      storeDescription, contactEmail, contactPhone,
      returnPolicyDays, footerCategories,
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
    safe('contactEmail', contactEmail);
    safe('contactPhone', contactPhone);
    safe('returnPolicyDays', returnPolicyDays != null ? Number(returnPolicyDays) : undefined);
    safe('footerCategories', footerCategories);

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
}
