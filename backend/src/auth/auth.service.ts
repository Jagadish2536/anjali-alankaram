import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordResetDto } from './dto/forgot-password-reset.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  // ── OTP Auth ──────────────────────────────────────────
  async sendOtp(email: string): Promise<{ message: string }> {
    const formattedEmail = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
    await this.prisma.otpCode.updateMany({
      where: { email: formattedEmail, used: false },
      data: { used: true },
    });

    // Save new OTP
    await this.prisma.otpCode.create({
      data: { email: formattedEmail, code, expiresAt },
    });

    // Send via Email AWS SES
    await this.emailService.sendOtpEmail(formattedEmail, code, 'login');
    this.logger.log(`🔑 [DEV/OTP] Generated login OTP for ${formattedEmail}: ${code}`);

    return { message: 'OTP sent successfully' };
  }

  async sendPhoneOtp(phone: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<{ message: string }> {
    const rawDigits = phone.replace(/\D/g, '');
    const cleanTenDigit = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
    if (cleanTenDigit.length !== 10) {
      throw new BadRequestException('Please enter a valid 10-digit phone number');
    }
    const formattedPhone = `+91${cleanTenDigit}`;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone: formattedPhone, used: false },
      data: { used: true },
    });

    // Save new OTP
    await this.prisma.otpCode.create({
      data: { phone: formattedPhone, code, expiresAt },
    });

    // Send via MSG91 (SMS or WhatsApp channel)
    await this.sendSmsViaMSG91(cleanTenDigit, code, false, channel);
    this.logger.log(`🔑 [DEV/OTP-${channel.toUpperCase()}] Generated login OTP for ${formattedPhone}: ${code}`);

    return { message: `OTP sent successfully via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}` };
  }

  async verifyPhoneOtp(phone: string, code: string) {
    const rawDigits = phone.replace(/\D/g, '');
    const cleanTenDigit = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
    const formattedPhone = `+91${cleanTenDigit}`;

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: formattedPhone,
        code: code.trim(),
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { phone: formattedPhone } });
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: { phone: formattedPhone, isPhoneVerified: true },
      });
    } else if (!user.isPhoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });
    }

    if (isNewUser) {
      this.notificationsService.sendAdminAlert('CUSTOMER_SIGNUP', {
        customerId: user.id,
        customerName: user.name || 'New User',
        customerPhone: user.phone,
      }).catch((err) => console.error('Failed to send admin signup alert', err));
    }

    return this.generateTokens(user);
  }

  async verifyOtp(email: string, code: string) {
    const formattedEmail = email.toLowerCase().trim();
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email: formattedEmail,
        code,
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { email: formattedEmail } });
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: { email: formattedEmail, isEmailVerified: true },
      });
    } else if (!user.isEmailVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
    }

    if (isNewUser) {
      this.notificationsService.sendAdminAlert('CUSTOMER_SIGNUP', {
        customerId: user.id,
        customerName: user.name || 'New User',
        customerEmail: user.email,
      }).catch(err => console.error('Failed to send admin signup alert', err));
    }

    return this.generateTokens(user);
  }

  // ── Google Auth ───────────────────────────────────────
  async googleAuth(idToken: string) {
    // Verify Google ID token
    const googleUser = await this.verifyGoogleToken(idToken);

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.sub },
          { email: googleUser.email },
        ],
      },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          isEmailVerified: true,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleUser.sub,
          name: user.name || googleUser.name,
          avatar: user.avatar || googleUser.picture,
          isEmailVerified: true,
        },
      });
    }

    if (isNewUser) {
      this.notificationsService.sendAdminAlert('CUSTOMER_SIGNUP', {
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
      }).catch(err => console.error('Failed to send admin signup alert', err));
    }

    // BOOTSTRAP: Always promote jagadishvarma99@gmail.com to ADMIN
    if (googleUser.email === 'jagadishvarma99@gmail.com' && user.role !== Role.ADMIN) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
      });
    }

    const requireSetup = !user.phone || !user.password;
    const tokens = await this.generateTokens(user);
    return {
      requireSetup,
      ...tokens,
    };
  }

  // ── Token Management ──────────────────────────────────
  async refreshToken(token: string) {
    const saved = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!saved || saved.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: saved.id } });
    return this.generateTokens(saved.user);
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
      emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
      whatsappNotificationsEnabled: user.whatsappNotificationsEnabled ?? true,
      hasPassword: !!user.password,
    };
  }

  // ── Register with Email & Password ─────────────────────
  async register(dto: RegisterDto) {
    const { name, email, phone, password } = dto;
    const formattedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: formattedEmail },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: formattedPhone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number is already registered');
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email: formattedEmail,
        phone: phone ? (phone.startsWith('+91') ? phone : `+91${phone}`) : null,
        password: passwordHash,
        isEmailVerified: false,
      },
    });

    this.notificationsService.sendAdminAlert('CUSTOMER_SIGNUP', {
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
    }).catch(err => console.error('Failed to send admin signup alert', err));

    return this.generateTokens(user);
  }

  // ── Login with Email/Phone & Password ─────────────────
  async login(dto: LoginDto) {
    const { email: identifier, password } = dto;
    const cleanIdentifier = identifier.trim();

    // Try to find by email or phone
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier },
          { phone: cleanIdentifier.startsWith('+91') ? cleanIdentifier : `+91${cleanIdentifier}` },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    if (!user.password) {
      throw new BadRequestException(
        'This account was created using Google or Phone OTP. Please log in using those methods.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    return this.generateTokens(user);
  }

  // ── Forgot Password ────────────────────────────────────
  async forgotPasswordRequest(
    emailOrPhone: string,
    channel: 'email' | 'sms' | 'whatsapp' = 'email',
  ): Promise<{ message: string }> {
    const cleanIdentifier = emailOrPhone.trim();
    const isInputPhone = /^[6-9]\d{9}$/.test(cleanIdentifier) || /^\+91[6-9]\d{9}$/.test(cleanIdentifier);
    const isInputEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

    if (!isInputPhone && !isInputEmail) {
      throw new BadRequestException('Please enter a valid email address or 10-digit phone number');
    }

    let user = null;
    let formattedPhone: string | null = null;
    let formattedEmail: string | null = null;

    if (isInputPhone) {
      formattedPhone = cleanIdentifier.startsWith('+91') ? cleanIdentifier : `+91${cleanIdentifier}`;
      user = await this.prisma.user.findUnique({ where: { phone: formattedPhone } });
    } else {
      formattedEmail = cleanIdentifier.toLowerCase();
      user = await this.prisma.user.findUnique({ where: { email: formattedEmail } });
    }

    if (!user) {
      throw new BadRequestException('User with this email or phone number does not exist');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this user
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Save new OTP
    await this.prisma.otpCode.create({
      data: {
        phone: formattedPhone || user.phone,
        email: formattedEmail || user.email,
        code,
        expiresAt,
        userId: user.id,
      },
    });

    // Send via requested channel (SMS / WhatsApp / Email)
    if (channel === 'sms' || channel === 'whatsapp' || (isInputPhone && channel !== 'email')) {
      const targetPhone = formattedPhone || user.phone;
      if (!targetPhone) {
        throw new BadRequestException('No registered phone number found for this account to send OTP via SMS/WhatsApp');
      }
      const rawTenDigits = targetPhone.replace(/\D/g, '').slice(-10);
      const selectedChannel = channel === 'whatsapp' ? 'whatsapp' : 'sms';
      await this.sendSmsViaMSG91(rawTenDigits, code, true, selectedChannel);
      this.logger.log(`🔑 [DEV/OTP-${selectedChannel.toUpperCase()}] Password reset OTP for ${targetPhone}: ${code}`);
      return { message: `Reset code sent successfully via ${selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}` };
    } else {
      // Send via AWS SES Email
      const targetEmail = formattedEmail || user.email;
      if (!targetEmail) {
        throw new BadRequestException('No registered email address found for this account to send OTP via Email');
      }
      await this.emailService.sendOtpEmail(targetEmail, code, 'reset');
      this.logger.log(`🔑 [DEV/OTP-EMAIL] Password reset OTP for ${targetEmail}: ${code}`);
      return { message: 'Reset code sent successfully via Email' };
    }
  }

  async forgotPasswordReset(dto: ForgotPasswordResetDto): Promise<{ message: string }> {
    const { emailOrPhone, code, password } = dto;
    const cleanIdentifier = emailOrPhone.trim();
    const isPhone = /^[6-9]\d{9}$/.test(cleanIdentifier) || /^\+91[6-9]\d{9}$/.test(cleanIdentifier);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

    if (!isPhone && !isEmail) {
      throw new BadRequestException('Invalid email address or phone number');
    }

    let formattedPhone = null;
    let formattedEmail = null;
    let otp = null;

    if (isPhone) {
      formattedPhone = cleanIdentifier.startsWith('+91') ? cleanIdentifier : `+91${cleanIdentifier}`;
      otp = await this.prisma.otpCode.findFirst({
        where: {
          phone: formattedPhone,
          code,
          used: false,
          expiresAt: { gte: new Date() },
        },
      });
    } else {
      formattedEmail = cleanIdentifier.toLowerCase();
      otp = await this.prisma.otpCode.findFirst({
        where: {
          email: formattedEmail,
          code,
          used: false,
          expiresAt: { gte: new Date() },
        },
      });
    }

    if (!otp || !otp.userId) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: otp.userId },
      data: { password: passwordHash },
    });

    // Invalidate refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: otp.userId },
    });

    return { message: 'Password reset successfully' };
  }

  // ── Private Helpers ───────────────────────────────────
  private async generateTokens(user: any) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '7d'),
    });

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
        whatsappNotificationsEnabled: user.whatsappNotificationsEnabled ?? true,
        hasPassword: !!user.password,
      },
    };
  }

  private async sendSmsViaMSG91(
    phone: string,
    code: string,
    isForgotPassword = false,
    channel: 'sms' | 'whatsapp' = 'sms',
  ): Promise<void> {
    const authKey = this.config.get('MSG91_AUTH_KEY');
    const templateId = isForgotPassword
      ? (this.config.get('MSG91_FORGOT_PASSWORD_TEMPLATE_ID') || this.config.get('MSG91_TEMPLATE_ID'))
      : this.config.get('MSG91_TEMPLATE_ID');
    const whatsappTemplateName = isForgotPassword
      ? (this.config.get('MSG91_WHATSAPP_FORGOT_PASSWORD_TEMPLATE_NAME') || this.config.get('MSG91_WHATSAPP_OTP_TEMPLATE_NAME'))
      : this.config.get('MSG91_WHATSAPP_OTP_TEMPLATE_NAME');
    const whatsappSender = this.config.get('MSG91_WHATSAPP_SENDER');

    // Clean phone number: remove non-digits, format with leading + and country code
    let rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length === 10) {
      rawDigits = `91${rawDigits}`;
    }
    const cleanPhone = rawDigits;
    const formattedE164 = `+${rawDigits}`;

    // ── Twilio Provider Integration ──────────────────────────────────────────
    const twilioAccountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const twilioApiKeySid = this.config.get<string>('TWILIO_API_KEY_SID') || this.config.get<string>('TWILIO_AUTH_TOKEN');
    const twilioApiSecret = this.config.get<string>('TWILIO_API_KEY_SECRET');
    const twilioFromPhone = this.config.get<string>('TWILIO_PHONE_NUMBER');
    const twilioFromWhatsapp = this.config.get<string>('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';

    if (twilioAccountSid && twilioApiKeySid) {
      const authHeader = 'Basic ' + Buffer.from(
        twilioApiSecret ? `${twilioApiKeySid}:${twilioApiSecret}` : `${twilioAccountSid}:${twilioApiKeySid}`
      ).toString('base64');

      const messageBody = isForgotPassword
        ? `Your Anjali Alankaram password reset verification code is: ${code}. Valid for 10 minutes.`
        : `Your Anjali Alankaram verification code is: ${code}. Valid for 10 minutes.`;

      if (channel === 'whatsapp') {
        try {
          const params = new URLSearchParams();
          params.append('From', twilioFromWhatsapp.startsWith('whatsapp:') ? twilioFromWhatsapp : `whatsapp:${twilioFromWhatsapp}`);
          params.append('To', `whatsapp:${formattedE164}`);
          params.append('Body', messageBody);

          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            params.toString(),
            {
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          );
          this.logger.log(`[Twilio-WhatsApp] OTP sent successfully to ${formattedE164}`);
          return;
        } catch (error: any) {
          this.logger.error('WhatsApp OTP send failed via Twilio:', error.response?.data?.message || error.message);
          // Fall through to SMS or MSG91
        }
      } else {
        try {
          const params = new URLSearchParams();
          params.append('From', twilioFromPhone || twilioFromWhatsapp.replace('whatsapp:', ''));
          params.append('To', formattedE164);
          params.append('Body', messageBody);

          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            params.toString(),
            {
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          );
          this.logger.log(`[Twilio-SMS] OTP sent successfully to ${formattedE164}`);
          return;
        } catch (error: any) {
          this.logger.error('SMS OTP send failed via Twilio:', error.response?.data?.message || error.message);
          // Fall through to MSG91
        }
      }
    }

    if (!authKey || process.env.NODE_ENV === 'development') {
      this.logger.log(
        `[DEV-${channel.toUpperCase()}] OTP for ${cleanPhone}: ${code} [Template: ${channel === 'whatsapp' ? whatsappTemplateName : templateId}]`,
      );
      return;
    }

    // 1. WhatsApp Channel
    if (channel === 'whatsapp') {
      if (!whatsappTemplateName || !whatsappSender) {
        this.logger.warn(`MSG91 WhatsApp not fully configured. Missing MSG91_WHATSAPP_OTP_TEMPLATE_NAME or MSG91_WHATSAPP_SENDER.`);
      } else {
        try {
          await axios.post(
            'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
            {
              integrated_number: whatsappSender,
              recipient_number: cleanPhone,
              content_type: 'template',
              template: {
                name: whatsappTemplateName,
                language: {
                  code: 'en',
                },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      {
                        type: 'text',
                        text: code,
                      },
                    ],
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
          return;
        } catch (error: any) {
          this.logger.error('WhatsApp OTP send failed via MSG91:', error.response?.data?.message || error.message);
          // Fall back to SMS if WhatsApp fails
        }
      }
    }

    // 2. SMS Channel (or fallback)
    try {
      await axios.post(
        'https://api.msg91.com/api/v5/otp',
        {
          mobile: cleanPhone,
          otp: code,
          template_id: templateId,
        },
        { headers: { authkey: authKey, 'content-type': 'application/json' } },
      );
    } catch (error: any) {
      this.logger.error('SMS OTP send failed via MSG91:', error.response?.data?.message || error.message);
      // Don't throw — log and continue in prod; OTP is saved in DB
    }
  }

  private async verifyGoogleToken(idToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      const payload = response.data;

      if (payload.aud !== this.config.get('GOOGLE_CLIENT_ID')) {
        throw new UnauthorizedException('Invalid Google token audience');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
