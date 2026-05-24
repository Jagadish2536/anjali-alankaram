import {
  Controller, Get, Post, Put, Body, Param, UseGuards, Req, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER'];

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Customer Routes ───────────────────────

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  async findAll(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details with status history' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Get(':id/track')
  @ApiOperation({ summary: 'Track order shipment status' })
  async trackOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.trackOrder(id, req.user.id, req.user.role);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history' })
  async getHistory(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getStatusHistory(id, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.cancel(id, req.user.id, reason || 'Customer requested cancellation');
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Request order return' })
  async requestReturn(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.requestReturn(id, req.user.id, reason);
  }

  @Post(':id/replace')
  @ApiOperation({ summary: 'Request order replacement with optional size/variant swap' })
  async requestReplacement(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('replacementVariantId') replacementVariantId?: string,
  ) {
    return this.ordersService.requestReplacement(
      id, req.user.id,
      reason || 'Customer requested replacement',
      replacementVariantId,
    );
  }

  // ─── Admin Routes ────────────────────────

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Get all orders (Admin/Warehouse/Order Manager)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAll({ status, search, page, limit });
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Get order details for admin' })
  async findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('admin/:id/history')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Get order status history (Admin)' })
  async getAdminHistory(@Param('id') id: string) {
    return this.ordersService.getStatusHistory(id);
  }

  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update order status (Admin)' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.ordersService.updateStatus(
      id,
      body.status,
      req.user.id,
      req.user.role,
      {
        notes: body.notes,
        awbCode: body.awbCode,
        trackingUrl: body.trackingUrl,
        cancelReason: body.cancelReason,
        courierName: body.courierName,
        warehouseId: body.warehouseId,
        refundId: body.refundId,
        pickupSlot: body.pickupSlot,
      },
    );
  }

  /**
   * Assign courier & AWB code → automatically transitions order to SHIPPED
   */
  @Put('admin/:id/assign-courier')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Assign delivery partner and AWB/tracking code (Admin)' })
  async assignCourier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { courierName: string; awbCode: string; trackingUrl?: string; notes?: string },
  ) {
    // First persist courier info via status update to SHIPPED
    return this.ordersService.updateStatus(
      id,
      'SHIPPED',
      req.user.id,
      req.user.role,
      {
        courierName: body.courierName,
        awbCode: body.awbCode,
        trackingUrl: body.trackingUrl || '',
        notes: body.notes || `Shipped via ${body.courierName}. AWB: ${body.awbCode}`,
      },
    );
  }
}
