import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RealtimeEventBroker } from '../settings/settings.controller';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products with filters & pagination' })
  async findAll(@Query() filters: ProductFilterDto) {
    return this.productsService.findAll(filters);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured products' })
  async getFeatured() {
    return this.productsService.getFeatured();
  }

  @Get('new-arrivals')
  @Public()
  @ApiOperation({ summary: 'Get new arrivals' })
  async getNewArrivals() {
    return this.productsService.getNewArrivals();
  }

  @Get('bestsellers')
  @Public()
  @ApiOperation({ summary: 'Get bestsellers' })
  async getBestsellers() {
    return this.productsService.getBestsellers();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: true })
  async search(@Query('q') query: string, @Query() filters: ProductFilterDto) {
    return this.productsService.search(query, filters);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post(':id/viewers')
  @Public()
  @ApiOperation({ summary: 'Register a product view heartbeat and get active viewers count' })
  async heartbeat(
    @Param('id') id: string,
    @Body('visitorId') visitorId: string,
  ) {
    return this.productsService.trackViewer(id, visitorId || 'anonymous');
  }

  @Post('variants/:variantId/notify-me')
  @Public()
  @ApiOperation({ summary: 'Subscribe to restock notifications' })
  async subscribeRestock(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body('email') email: string,
    @Body('productId') productId?: string,
  ) {
    return this.productsService.subscribeRestock(variantId, email, productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin)' })
  async create(@Body() dto: CreateProductDto) {
    const p = await this.productsService.create(dto);
    RealtimeEventBroker.emit('products-updated', p);
    return p;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    const p = await this.productsService.update(id, dto);
    RealtimeEventBroker.emit('products-updated', p);
    return p;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.productsService.remove(id);
    RealtimeEventBroker.emit('products-updated', { id });
    return p;
  }
}
