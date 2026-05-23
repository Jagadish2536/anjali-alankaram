import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ── Public: validate a coupon code ────────────────────────────────────────
  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code (public, but userId-aware if logged in)' })
  async validate(
    @Body() body: { code: string; subtotal: number; userId?: string },
    @Req() req: Request,
  ) {
    // Use userId from body (passed by client) or fall back to JWT user if authenticated
    const userId = body.userId || (req as any).user?.id;
    return this.couponsService.validate(body.code, body.subtotal, userId);
  }

  // ── Admin routes ──────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all coupons (Admin)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create coupon (Admin)' })
  async create(@Body() dto: any) {
    return this.couponsService.create({
      ...dto,
      code: dto.code?.toUpperCase().trim(),
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon (Admin)' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.couponsService.update(id, {
      ...dto,
      ...(dto.code && { code: dto.code.toUpperCase().trim() }),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete coupon (Admin)' })
  async remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
