import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, isApproved: true },
      include: {
        user: { select: { name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(userId: string, dto: any) {
    const existing = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId }
    });

    if (existing) throw new BadRequestException('You have already reviewed this product');

    // Check if user bought the product
    const hasBought = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: 'DELIVERED' }
      }
    });

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        userId,
        isVerified: !!hasBought
      }
    });

    // Update product average rating
    await this.updateProductRating(dto.productId);

    return review;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findFirst({ where: { id, userId } });
    if (!review) return;

    await this.prisma.review.delete({ where: { id } });
    await this.updateProductRating(review.productId);
  }

  private async updateProductRating(productId: string) {
    const aggr = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true }
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: aggr._avg.rating || 0,
        reviewCount: aggr._count.id
      }
    });
  }
}
