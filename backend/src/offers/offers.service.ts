import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.offer.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findActive() {
    return this.prisma.offer.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.offer.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.offer.create({ data: this.sanitize(data) });
  }

  async update(id: string, data: any) {
    return this.prisma.offer.update({ where: { id }, data: this.sanitize(data) });
  }

  async remove(id: string) {
    return this.prisma.offer.delete({ where: { id } });
  }

  private sanitize(data: any) {
    const clean: any = { ...data };
    if (clean.minProductPrice !== undefined && clean.minProductPrice !== null && clean.minProductPrice !== '') {
      clean.minProductPrice = parseFloat(String(clean.minProductPrice));
    } else {
      clean.minProductPrice = null;
    }
    if (clean.maxProductPrice !== undefined && clean.maxProductPrice !== null && clean.maxProductPrice !== '') {
      clean.maxProductPrice = parseFloat(String(clean.maxProductPrice));
    } else {
      clean.maxProductPrice = null;
    }
    if (clean.offerPrice !== undefined && clean.offerPrice !== null && clean.offerPrice !== '') {
      clean.offerPrice = parseFloat(String(clean.offerPrice));
    } else {
      clean.offerPrice = null;
    }
    if (clean.offerType !== undefined) {
      clean.offerType = String(clean.offerType);
    } else {
      clean.offerType = 'BUY_X_GET_Y';
    }
    if (clean.buyQuantity !== undefined) {
      clean.buyQuantity = parseInt(String(clean.buyQuantity), 10);
    }
    if (clean.getQuantity !== undefined) {
      clean.getQuantity = parseInt(String(clean.getQuantity), 10);
    }
    if (clean.isActive !== undefined) {
      clean.isActive = Boolean(clean.isActive);
    }
    if (!Array.isArray(clean.productIds)) {
      clean.productIds = [];
    }
    if (!Array.isArray(clean.categoryIds)) {
      clean.categoryIds = [];
    }
    return clean;
  }

  /**
   * Calculates the best offer for the given cart items.
   * Returns details of the best offer (title, discount amount, id) or null if no offer applies.
   */
  async calculateBestOffer(cartItems: any[]) {
    // Check if offers are enabled globally
    const settings = await this.prisma.storeSettings.findFirst();
    if (!settings || !settings.offersEnabled) {
      return null;
    }

    if (!cartItems || cartItems.length === 0) {
      return null;
    }

    // Get all active offers
    const activeOffers = await this.prisma.offer.findMany({
      where: { isActive: true }
    });

    if (activeOffers.length === 0) {
      return null;
    }

    let bestOffer = null;
    let maxDiscount = 0;

    for (const offer of activeOffers) {
      // 1. Find qualifying units in the cart
      const qualifyingUnits: number[] = [];

      for (const item of cartItems) {
        const product = item.product;
        const variant = item.variant;
        if (!product) continue;

        // Calculate unit price: sale price (or base price) + variant extra price
        const unitPrice = Number(product.salePrice || product.basePrice) + Number(variant?.extraPrice || 0);

        // Check if product is in the offer's productIds or categoryIds (if filters are set)
        const o = offer as any;
        if (
          (o.productIds && o.productIds.length > 0) ||
          (o.categoryIds && o.categoryIds.length > 0)
        ) {
          const matchesProduct = o.productIds?.includes(product.id) ?? false;
          const matchesCategory = o.categoryIds?.includes(product.categoryId) ?? false;
          if (!matchesProduct && !matchesCategory) {
            continue;
          }
        }

        // Check product price range
        if (offer.minProductPrice && unitPrice < Number(offer.minProductPrice)) {
          continue;
        }
        if (offer.maxProductPrice && unitPrice > Number(offer.maxProductPrice)) {
          continue;
        }

        // Add each quantity unit as an individual price to our pool
        for (let i = 0; i < item.quantity; i++) {
          qualifyingUnits.push(unitPrice);
        }
      }

      const o = offer as any;
      if (o.offerType === 'BUY_X_FOR_Y') {
        const groupSize = offer.buyQuantity;
        const groupCount = Math.floor(qualifyingUnits.length / groupSize);
        if (groupCount === 0) {
          continue;
        }

        // Sort descending to group the most expensive items first
        qualifyingUnits.sort((a, b) => b - a);

        const promoItemsCount = groupCount * groupSize;
        let originalPromoSum = 0;
        for (let i = 0; i < promoItemsCount; i++) {
          originalPromoSum += qualifyingUnits[i];
        }

        const packagePrice = groupCount * Number(o.offerPrice || 0);
        const offerDiscount = originalPromoSum - packagePrice;

        if (offerDiscount > 0 && offerDiscount > maxDiscount) {
          maxDiscount = offerDiscount;
          bestOffer = {
            id: offer.id,
            title: offer.title,
            discount: Math.round(offerDiscount),
          };
        }
      } else {
        // Check if we have enough qualifying units for the offer
        const offerGroupSize = offer.buyQuantity + offer.getQuantity;
        if (qualifyingUnits.length < offerGroupSize) {
          continue;
        }

        // 2. Calculate Buy X Get Y Free discount
        // Sort qualifying unit prices ascending (cheapest first)
        qualifyingUnits.sort((a, b) => a - b);

        // Determine how many items are free:
        // For every group of (buyQuantity + getQuantity) items, getQuantity items are free
        const groupCount = Math.floor(qualifyingUnits.length / offerGroupSize);
        const freeCount = groupCount * offer.getQuantity;

        // The cheapest freeCount items are free
        let offerDiscount = 0;
        for (let i = 0; i < freeCount; i++) {
          offerDiscount += qualifyingUnits[i];
        }

        if (offerDiscount > 0 && offerDiscount > maxDiscount) {
          maxDiscount = offerDiscount;
          bestOffer = {
            id: offer.id,
            title: offer.title,
            discount: Math.round(offerDiscount),
          };
        }
      }
    }

    return bestOffer;
  }
}
