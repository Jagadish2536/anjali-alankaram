import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

export interface StatusHistoryEntry {
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  actorId?: string;
  actorRole?: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'WAREHOUSE_STAFF' | 'SYSTEM' | 'WEBHOOK';
  notes?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class OrderStatusHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Append a status change entry — immutable audit log.
   */
  async append(entry: StatusHistoryEntry) {
    return this.prisma.$executeRawUnsafe(
      `INSERT INTO "order_status_history" 
       ("id","orderId","fromStatus","toStatus","actorId","actorRole","notes","metadata","createdAt")
       VALUES (gen_random_uuid(), $1, $2::"OrderStatus", $3::"OrderStatus", $4, $5, $6, $7::jsonb, NOW())`,
      entry.orderId,
      entry.fromStatus ?? null,
      entry.toStatus,
      entry.actorId ?? null,
      entry.actorRole ?? 'SYSTEM',
      entry.notes ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    );
  }

  /**
   * Get full status timeline for an order.
   */
  async findByOrder(orderId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT h.*, u.name as "actorName", u.role as "actorUserRole"
       FROM "order_status_history" h
       LEFT JOIN "users" u ON u.id = h."actorId"
       WHERE h."orderId" = $1
       ORDER BY h."createdAt" ASC`,
      orderId
    );
    return rows;
  }

  /**
   * Get the label for a status (for notifications etc.)
   */
  getStatusLabel(status: OrderStatus): string {
    const labels: Record<string, string> = {
      PENDING_PAYMENT:    'Order Placed',
      PAYMENT_VERIFIED:   'Order Placed',
      CONFIRMED:          'Order Confirmed',
      INVENTORY_RESERVED: 'Order Confirmed',
      PROCESSING:         'Order Confirmed',
      PICKING:            'Order Confirmed',
      PACKED:             'Packed',
      READY_FOR_SHIPMENT: 'Packed',
      SHIPPED:            'Shipped',
      IN_TRANSIT:         'In Transit',
      OUT_FOR_DELIVERY:   'Out for Delivery',
      DELIVERED:          'Delivered',
      RETURN_REQUESTED:   'Return Initiated',
      RETURN_APPROVED:    'Return Initiated',
      RETURN_REJECTED:    'Return Rejected',
      PICKUP_SCHEDULED:   'Order Picked Up',
      RETURNED:           'Order Picked Up',
      REFUND_INITIATED:   'Payment Processed',
      REFUNDED:           'Payment Refunded',
      CANCELLED:          'Cancelled',
    };
    return labels[status] ?? status;
  }

  /**
   * Validate that a status transition is allowed.
   * Returns the allowed next statuses for a given current status.
   * Admins bypass this check — they use force override.
   */
  getAllowedNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    const transitions: Record<string, OrderStatus[]> = {
      PENDING_PAYMENT:    ['PAYMENT_VERIFIED', 'CANCELLED'],
      PAYMENT_VERIFIED:   ['CONFIRMED', 'CANCELLED'],
      CONFIRMED:          ['INVENTORY_RESERVED', 'PACKED', 'CANCELLED'],
      INVENTORY_RESERVED: ['PROCESSING', 'PACKED', 'CANCELLED'],
      PROCESSING:         ['PICKING', 'PACKED', 'CANCELLED'],
      PICKING:            ['PACKED', 'CANCELLED'],
      PACKED:             ['SHIPPED'],
      READY_FOR_SHIPMENT: ['SHIPPED'],
      SHIPPED:            ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
      IN_TRANSIT:         ['OUT_FOR_DELIVERY', 'DELIVERED'],
      OUT_FOR_DELIVERY:   ['DELIVERED'],
      DELIVERED:          ['RETURN_REQUESTED'],
      RETURN_REQUESTED:   ['RETURN_APPROVED', 'RETURN_REJECTED'],
      RETURN_APPROVED:    ['PICKUP_SCHEDULED'],
      PICKUP_SCHEDULED:   ['RETURNED'],
      RETURNED:           ['REFUND_INITIATED'],
      REFUND_INITIATED:   ['REFUNDED'],
      REFUNDED:           [],
      CANCELLED:          [],
    };
    return (transitions as any)[currentStatus] ?? [];
  }

  isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    const allowed = this.getAllowedNextStatuses(from);
    return allowed.includes(to);
  }
}
