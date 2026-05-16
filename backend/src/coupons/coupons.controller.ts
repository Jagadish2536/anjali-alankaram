import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all coupons (Admin)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create coupon (Admin)' })
  async create(@Body() dto: any) {
    return this.couponsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update coupon (Admin)' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete coupon (Admin)' })
  async remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
