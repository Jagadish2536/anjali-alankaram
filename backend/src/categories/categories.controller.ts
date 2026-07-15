import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RealtimeEventBroker } from '../settings/settings.controller';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active categories' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (Admin)' })
  async create(@Body() dto: any) {
    const c = await this.categoriesService.create(dto);
    RealtimeEventBroker.emit('categories-updated', c);
    return c;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin)' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const c = await this.categoriesService.update(id, dto);
    RealtimeEventBroker.emit('categories-updated', c);
    return c;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Admin)' })
  async remove(@Param('id') id: string) {
    const c = await this.categoriesService.remove(id);
    RealtimeEventBroker.emit('categories-updated', { id });
    return c;
  }
}
