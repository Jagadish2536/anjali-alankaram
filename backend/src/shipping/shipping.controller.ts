import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { DtdcService } from './dtdc.service';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER'];

import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Shipping & DTDC')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly dtdcService: DtdcService,
    private readonly shippingService: ShippingService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Health / configuration check for DTDC
   */
  @Get('dtdc/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current DTDC integration configuration status' })
  getDtdcConfig() {
    return {
      status: 'ok',
      config: this.dtdcService.getConfigStatus(),
    };
  }

  /**
   * Create DTDC Consignment for an order
   */
  @Post('dtdc/orders/:orderId/ship')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create DTDC consignment (AWB) for an order' })
  async bookDtdcOrder(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body()
    body?: {
      serviceType?: string;
      weightKg?: number;
      length?: number;
      width?: number;
      height?: number;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        items: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Call DTDC Order Upload API
    const dtdcRes = await this.dtdcService.createShipment(order, body);

    // Update order with AWB code, courierName, trackingUrl and status PACKED
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        awbCode: dtdcRes.awb,
        courierName: 'DTDC',
        trackingUrl: dtdcRes.trackingUrl,
        courierTrackingId: dtdcRes.referenceNumber,
        status: 'PACKED',
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'PACKED',
            notes: `Booked via DTDC API. Consignment Packed & Awaiting Pickup Scan. AWB: ${dtdcRes.awb}`,
            actorId: req.user?.id,
            actorRole: req.user?.role || 'ADMIN',
            metadata: { awbCode: dtdcRes.awb, courierName: 'DTDC' },
          },
        },
      },
    });

    // Send customer order update notification (WhatsApp, In-App, Push)
    if (order.userId) {
      await this.notificationsService
        .sendOrderNotification(order.userId, 'ORDER_UPDATE' as any, orderId, order.orderNumber)
        .catch(() => {});
    }

    // Proactively register with tracking provider
    this.shippingService.registerTracking(dtdcRes.awb, 'DTDC').catch(() => {});

    return {
      success: true,
      message: `DTDC Consignment created successfully. AWB: ${dtdcRes.awb}`,
      awb: dtdcRes.awb,
      trackingUrl: dtdcRes.trackingUrl,
      order: updatedOrder,
    };
  }

  /**
   * Stream or download official DTDC shipping label (PDF or Base64)
   */
  @Get('dtdc/label/:awb')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download or stream DTDC shipping label (4x6 or A4)' })
  async downloadLabel(
    @Param('awb') awb: string,
    @Query('code') labelCode: string = 'SHIP_LABEL_4X6',
    @Query('format') format: 'pdf' | 'base64' = 'pdf',
    @Res() res: Response,
  ) {
    const labelResult = await this.dtdcService.getShippingLabel(
      awb,
      labelCode,
      format,
    );

    if (format === 'base64') {
      return res.json(labelResult.data);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${labelResult.filename}"`,
      'Content-Length': (labelResult.data as Buffer).length,
    });

    return res.end(labelResult.data);
  }

  /**
   * Cancel DTDC Consignment for an order
   */
  @Post('dtdc/cancel/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel DTDC consignment' })
  async cancelDtdcConsignment(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!order.awbCode) {
      throw new BadRequestException('Order does not have an AWB code to cancel');
    }

    const cancelRes = await this.dtdcService.cancelShipment(order.awbCode);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelReason: 'DTDC Consignment Cancelled by Admin',
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'CANCELLED',
            notes: `DTDC shipment cancelled for AWB ${order.awbCode}`,
            actorId: req.user?.id,
            actorRole: req.user?.role || 'ADMIN',
            metadata: { awbCode: order.awbCode },
          },
        },
      },
    });

    return {
      success: true,
      message: `DTDC consignment ${order.awbCode} cancelled successfully`,
      cancelResult: cancelRes,
    };
  }

  /**
   * Track AWB directly via DTDC Tracking API V4
   */
  @Public()
  @Get('dtdc/track/:awb')
  @ApiOperation({ summary: 'Track consignment via DTDC Tracking API V4' })
  async trackDtdc(@Param('awb') awb: string) {
    const events = await this.dtdcService.trackShipment(awb);
    return {
      awb,
      courier: 'DTDC',
      events,
    };
  }
}
