import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsEnum, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class CreateVariantDto {
  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiPropertyOptional({ example: 'Rose Gold' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '#B76E79' })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  extraPrice?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Floral Anarkali Suit' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Beautiful floral print anarkali suit...' })
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDesc?: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 2499.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: number;

  @ApiPropertyOptional({ example: 1999.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salePrice?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  images: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBestseller?: boolean;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  variants?: CreateVariantDto[];

  @ApiPropertyOptional({ example: 'https://www.instagram.com/reel/ABC123/' })
  @IsOptional()
  @IsString()
  instagramReelUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  codAvailable?: boolean;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  returnEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  replaceEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Size guide rows as JSON array' })
  @IsOptional()
  sizeGuide?: any;
}
