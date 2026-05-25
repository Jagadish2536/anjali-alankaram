import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Warehouse')
@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'STOCK_MANAGER')
@ApiBearerAuth()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  findAll() { return this.warehouseService.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse details' })
  findOne(@Param('id') id: string) { return this.warehouseService.findOne(id); }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create warehouse' })
  create(@Body() body: any) { return this.warehouseService.create(body); }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update warehouse' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.warehouseService.update(id, body);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Warehouse dashboard stats' })
  getStats(@Param('id') id: string) {
    return this.warehouseService.getDashboardStats(id);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Get warehouse inventory' })
  getInventory(
    @Param('id') id: string,
    @Query('search') search?: string,
  ) { return this.warehouseService.getInventory(id, search); }

  @Put(':id/inventory/:variantId')
  @ApiOperation({ summary: 'Update warehouse inventory for a variant' })
  updateInventory(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body('quantity') quantity: number,
  ) { return this.warehouseService.updateInventory(id, variantId, quantity); }

  @Get(':id/picklist')
  @ApiOperation({ summary: 'Get pick list for warehouse' })
  getPickList(@Param('id') id: string) {
    return this.warehouseService.getPickList(id);
  }

  @Put('items/:itemId/pick')
  @ApiOperation({ summary: 'Mark order item as picked' })
  markPicked(@Param('itemId') itemId: string, @Body('isPicked') isPicked: boolean) {
    return this.warehouseService.markItemPicked(itemId, isPicked);
  }

  @Get(':id/packing-queue')
  @ApiOperation({ summary: 'Get packing queue for warehouse' })
  getPackingQueue(@Param('id') id: string) {
    return this.warehouseService.getPackingQueue(id);
  }

  @Put('items/:itemId/pack')
  @ApiOperation({ summary: 'Mark order item as packed' })
  markPacked(@Param('itemId') itemId: string, @Body('isPacked') isPacked: boolean) {
    return this.warehouseService.markItemPacked(itemId, isPacked);
  }
}
