import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private ses: SESClient;
  private fromEmail: string;
  private fromName: string;

  constructor(private config: ConfigService) {
    this.ses = new SESClient({ region: this.config.get('AWS_REGION', 'ap-south-2') });
    this.fromEmail = this.config.get('SES_FROM_EMAIL', 'noreply@anjalialankaram.com');
    this.fromName = this.config.get('SES_FROM_NAME', 'Anjali Alankaram');
  }

  // ── Core send ─────────────────────────────────────────────────────────
  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!to) return;

    try {
      await this.ses.send(new SendEmailCommand({
        Source: `${this.fromName} <${this.fromEmail}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      }));
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      // Non-blocking — never throw
    }
  }

  // ── Shared HTML wrapper ───────────────────────────────────────────────
  private wrap(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anjali Alankaram</title>
</head>
<body style="margin:0;padding:0;background:#FDF5EC;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDF5EC;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#8B0030;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#FDF5EC;font-size:26px;letter-spacing:1px;">
              Anjali Alankaram
            </h1>
            <p style="margin:4px 0 0;color:#f0c8d0;font-size:13px;">Premium Silk Sarees</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1a1a1a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#888;font-size:12px;">
              &copy; 2025 Anjali Alankaram · All rights reserved<br>
              <a href="https://anjalialankaram.com" style="color:#c06080;text-decoration:none;">anjalialankaram.com</a>
              &nbsp;|&nbsp;
              <a href="https://wa.me/917032492775" style="color:#c06080;text-decoration:none;">WhatsApp Support</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── 1. OTP Email ──────────────────────────────────────────────────────
  async sendOtpEmail(to: string, otp: string, purpose: 'login' | 'reset' = 'reset'): Promise<void> {
    const isReset = purpose === 'reset';
    const subject = isReset
      ? 'Reset Your Password — Anjali Alankaram'
      : 'Your Login OTP — Anjali Alankaram';

    const content = `
      <h2 style="color:#8B0030;margin:0 0 8px;">
        ${isReset ? '🔐 Password Reset Code' : '🔑 Your Login OTP'}
      </h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        ${isReset
          ? 'You requested to reset your password. Use the code below:'
          : 'Use the following OTP to complete your login:'}
      </p>

      <!-- OTP Box -->
      <div style="background:#FDF5EC;border:2px dashed #8B0030;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
        <span style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#8B0030;">${otp}</span>
      </div>

      <p style="color:#888;font-size:13px;margin:0;">
        ⏱ This code expires in <strong>10 minutes</strong>.<br>
        If you did not request this, please ignore this email.
      </p>`;

    await this.send(to, subject, this.wrap(content));
  }

  // ── 2. Order Confirmation ─────────────────────────────────────────────
  async sendOrderConfirmation(to: string, data: {
    customerName: string;
    orderNumber: string;
    items: { name: string; size: string; qty: number; price: number }[];
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
    paymentMethod: string;
    address: string;
  }): Promise<void> {
    const itemRows = data.items.map(i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#333;font-size:14px;">
          ${i.name} <span style="color:#888;">(${i.size})</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#333;font-size:14px;text-align:center;">
          ×${i.qty}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#333;font-size:14px;text-align:right;">
          ₹${(i.price * i.qty).toLocaleString('en-IN')}
        </td>
      </tr>`).join('');

    const content = `
      <h2 style="color:#8B0030;margin:0 0 4px;">✅ Order Confirmed!</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Hi <strong>${data.customerName || 'there'}</strong>, thank you for your order!<br>
        We'll notify you when it's packed and shipped.
      </p>

      <!-- Order Number Badge -->
      <div style="background:#8B0030;border-radius:8px;padding:14px 20px;margin:0 0 24px;display:inline-block;">
        <span style="color:#FDF5EC;font-size:13px;">Order Number</span><br>
        <span style="color:#ffffff;font-size:20px;font-weight:bold;">${data.orderNumber}</span>
      </div>

      <!-- Items Table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <thead>
          <tr style="background:#FDF5EC;">
            <th style="padding:10px 0;color:#8B0030;font-size:13px;text-align:left;">Item</th>
            <th style="padding:10px 0;color:#8B0030;font-size:13px;text-align:center;">Qty</th>
            <th style="padding:10px 0;color:#8B0030;font-size:13px;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="padding:6px 0;color:#666;font-size:14px;">Subtotal</td>
          <td style="padding:6px 0;color:#333;font-size:14px;text-align:right;">₹${data.subtotal.toLocaleString('en-IN')}</td>
        </tr>
        ${data.discount > 0 ? `<tr>
          <td style="padding:6px 0;color:#27ae60;font-size:14px;">Discount</td>
          <td style="padding:6px 0;color:#27ae60;font-size:14px;text-align:right;">−₹${data.discount.toLocaleString('en-IN')}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;color:#666;font-size:14px;">Shipping</td>
          <td style="padding:6px 0;color:#333;font-size:14px;text-align:right;">
            ${data.shipping === 0 ? '<span style="color:#27ae60;">FREE</span>' : `₹${data.shipping}`}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#8B0030;font-size:16px;font-weight:bold;border-top:2px solid #8B0030;">Total</td>
          <td style="padding:10px 0;color:#8B0030;font-size:16px;font-weight:bold;text-align:right;border-top:2px solid #8B0030;">
            ₹${data.total.toLocaleString('en-IN')}
          </td>
        </tr>
      </table>

      <!-- Payment & Address -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right:10px;vertical-align:top;">
            <div style="background:#FDF5EC;border-radius:8px;padding:14px;">
              <p style="margin:0 0 6px;color:#8B0030;font-weight:bold;font-size:13px;">💳 Payment</p>
              <p style="margin:0;color:#555;font-size:14px;">${data.paymentMethod}</p>
            </div>
          </td>
          <td width="50%" style="padding-left:10px;vertical-align:top;">
            <div style="background:#FDF5EC;border-radius:8px;padding:14px;">
              <p style="margin:0 0 6px;color:#8B0030;font-weight:bold;font-size:13px;">📦 Deliver To</p>
              <p style="margin:0;color:#555;font-size:13px;line-height:1.5;">${data.address}</p>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="https://anjalialankaram.com/orders" style="background:#8B0030;color:#FDF5EC;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">
          Track My Order →
        </a>
      </div>`;

    await this.send(to, `Order Confirmed ✅ — #${data.orderNumber}`, this.wrap(content));
  }

  // ── 3. Order Shipped ──────────────────────────────────────────────────
  async sendOrderShipped(to: string, data: {
    customerName: string;
    orderNumber: string;
    courier: string;
    awbCode: string;
    trackingUrl?: string;
  }): Promise<void> {
    const content = `
      <h2 style="color:#8B0030;margin:0 0 8px;">🚚 Your Order is Shipped!</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Hi <strong>${data.customerName || 'there'}</strong>, great news!<br>
        Your order <strong>#${data.orderNumber}</strong> has been shipped.
      </p>

      <div style="background:#FDF5EC;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#888;font-size:13px;padding-bottom:8px;">Courier Partner</td>
            <td style="color:#333;font-size:14px;font-weight:bold;text-align:right;padding-bottom:8px;">${data.courier}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:13px;">Tracking ID</td>
            <td style="color:#8B0030;font-size:16px;font-weight:bold;text-align:right;letter-spacing:1px;">${data.awbCode}</td>
          </tr>
        </table>
      </div>

      ${data.trackingUrl ? `
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.trackingUrl}" style="background:#8B0030;color:#FDF5EC;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">
          Track Your Package →
        </a>
      </div>` : ''}

      <p style="color:#888;font-size:13px;margin:0;">
        Expected delivery in 3-7 business days.<br>
        Questions? WhatsApp us at <a href="https://wa.me/917032492775" style="color:#8B0030;">+91 70324 92775</a>
      </p>`;

    await this.send(to, `Your Order is On the Way! 🚚 — #${data.orderNumber}`, this.wrap(content));
  }

  // ── 4. Order Delivered ────────────────────────────────────────────────
  async sendOrderDelivered(to: string, data: {
    customerName: string;
    orderNumber: string;
  }): Promise<void> {
    const content = `
      <h2 style="color:#8B0030;margin:0 0 8px;">🎉 Order Delivered!</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Hi <strong>${data.customerName || 'there'}</strong>,<br>
        Your order <strong>#${data.orderNumber}</strong> has been delivered. Hope you love it! 💖
      </p>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="https://anjalialankaram.com/orders" style="background:#8B0030;color:#FDF5EC;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">
          Write a Review →
        </a>
      </div>

      <p style="color:#888;font-size:13px;margin:0;">
        Love your saree? Share it on Instagram <a href="https://instagram.com/jagadishvarma99" style="color:#8B0030;">@jagadishvarma99</a><br>
        Any issues? WhatsApp us at <a href="https://wa.me/917032492775" style="color:#8B0030;">+91 70324 92775</a>
      </p>`;

    await this.send(to, `Delivered! 🎉 Your Order #${data.orderNumber}`, this.wrap(content));
  }

  // ── 5. Order Cancelled ────────────────────────────────────────────────
  async sendOrderCancelled(to: string, data: {
    customerName: string;
    orderNumber: string;
    reason?: string;
  }): Promise<void> {
    const content = `
      <h2 style="color:#8B0030;margin:0 0 8px;">❌ Order Cancelled</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Hi <strong>${data.customerName || 'there'}</strong>,<br>
        Your order <strong>#${data.orderNumber}</strong> has been cancelled.
        ${data.reason ? `<br><br>Reason: <em>${data.reason}</em>` : ''}
      </p>
      <p style="color:#888;font-size:13px;margin:0;">
        If a payment was made, refund will be processed within 5-7 business days.<br>
        Questions? WhatsApp us at <a href="https://wa.me/917032492775" style="color:#8B0030;">+91 70324 92775</a>
      </p>`;

    await this.send(to, `Order Cancelled — #${data.orderNumber}`, this.wrap(content));
  }

  // ── 6. Order Refunded ──────────────────────────────────────────────────
  async sendOrderRefunded(to: string, data: {
    customerName: string;
    orderNumber: string;
    amount: number;
    status: 'REFUND_INITIATED' | 'REFUNDED';
  }): Promise<void> {
    const isInitiated = data.status === 'REFUND_INITIATED';
    const subject = isInitiated
      ? `Refund Initiated — #${data.orderNumber}`
      : `Refund Processed Successfully — #${data.orderNumber}`;

    const content = `
      <h2 style="color:#8B0030;margin:0 0 8px;">
        ${isInitiated ? '💸 Refund Initiated' : '✅ Refund Processed'}
      </h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Hi <strong>${data.customerName || 'there'}</strong>,<br>
        ${isInitiated
          ? `We have initiated a refund of <strong>₹${data.amount.toLocaleString('en-IN')}</strong> for your order <strong>#${data.orderNumber}</strong>.`
          : `A refund of <strong>₹${data.amount.toLocaleString('en-IN')}</strong> for your order <strong>#${data.orderNumber}</strong> has been successfully processed.`}
      </p>
      <div style="background:#FDF5EC;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#888;font-size:13px;padding-bottom:8px;">Order Number</td>
            <td style="color:#333;font-size:14px;font-weight:bold;text-align:right;padding-bottom:8px;">#${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:13px;padding-bottom:8px;">Refund Amount</td>
            <td style="color:#8B0030;font-size:16px;font-weight:bold;text-align:right;padding-bottom:8px;">₹${data.amount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:13px;">Status</td>
            <td style="color:#333;font-size:14px;font-weight:bold;text-align:right;">${isInitiated ? 'Initiated' : 'Completed'}</td>
          </tr>
        </table>
      </div>
      <p style="color:#888;font-size:13px;margin:0;">
        It usually takes 5-7 business days for the refund to reflect in your original payment method.<br>
        Questions? WhatsApp us at <a href="https://wa.me/917032492775" style="color:#8B0030;">+91 70324 92775</a>
      </p>`;

    await this.send(to, subject, this.wrap(content));
  }
}
