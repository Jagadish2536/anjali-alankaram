import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ── OTP Auth ──────────────────────────────────────────
  async sendOtp(phone: string): Promise<{ message: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
    await this.prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    // Save new OTP
    await this.prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    // Send via MSG91
    await this.sendSmsViaMSG91(phone, code);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
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
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, isPhoneVerified: true },
      });
    } else if (!user.isPhoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });
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

    if (!user) {
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

    // BOOTSTRAP: Always promote jagadishvarma99@gmail.com to ADMIN
    if (googleUser.email === 'jagadishvarma99@gmail.com' && user.role !== Role.ADMIN) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
      });
    }

    return this.generateTokens(user);
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
    return this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        isPhoneVerified: true,
        isEmailVerified: true,
      },
    });
  }

  // ── Private Helpers ───────────────────────────────────
  private async generateTokens(user: any) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
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
      },
    };
  }

  private async sendSmsViaMSG91(phone: string, code: string): Promise<void> {
    const authKey = this.config.get('MSG91_AUTH_KEY');
    const templateId = this.config.get('MSG91_TEMPLATE_ID');

    if (!authKey || process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${code}`);
      return;
    }

    try {
      await axios.post(
        'https://api.msg91.com/api/v5/otp',
        {
          mobile: `91${phone}`,
          otp: code,
          template_id: templateId,
        },
        { headers: { authkey: authKey, 'content-type': 'application/json' } },
      );
    } catch (error) {
      console.error('SMS send failed:', error.message);
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
