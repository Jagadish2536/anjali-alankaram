import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      revenue,
      statusBreakdown,
      recentOrders,
      lowStockVariants,
      dailyRevenue,
    ] = await Promise.all([
      // Total customers (CUSTOMER role only)
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),

      // Total orders
      this.prisma.order.count(),

      // Active products
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),

      // Total revenue from paid orders
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),

      // Order counts per status
      this.prisma.$queryRawUnsafe<{ status: string; count: number }[]>(`
        SELECT status, COUNT(*)::int as count
        FROM "orders"
        GROUP BY status
        ORDER BY count DESC
      `),

      // Recent 10 orders with user info
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          items: {
            take: 1,
            include: { product: { select: { name: true, images: true } } },
          },
        },
      }),

      // Low stock variants
      this.prisma.productVariant.count({
        where: { stock: { lte: 5 }, isActive: true },
      }),

      // Last 7 days daily revenue
      this.prisma.$queryRawUnsafe<{ date: string; revenue: number; orders: number }[]>(`
        SELECT 
          DATE("createdAt")::text as date,
          SUM("totalAmount")::float as revenue,
          COUNT(*)::int as orders
        FROM "orders"
        WHERE 
          "createdAt" >= NOW() - INTERVAL '7 days'
          AND status NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `),
    ]);

    // Compute pending orders from status breakdown
    const pendingStatuses = [
      'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'CONFIRMED',
      'INVENTORY_RESERVED', 'PROCESSING', 'PICKING', 'PACKED', 'READY_FOR_SHIPMENT',
      // Legacy
      'PENDING',
    ];
    const pendingOrders = (statusBreakdown as any[])
      .filter(s => pendingStatuses.includes(s.status))
      .reduce((sum, s) => sum + Number(s.count), 0);

    const deliveredOrders = (statusBreakdown as any[]).find(s => s.status === 'DELIVERED')?.count || 0;
    const cancelledOrders = (statusBreakdown as any[]).find(s => s.status === 'CANCELLED')?.count || 0;
    const returnRequested = (statusBreakdown as any[]).find(s => s.status === 'RETURN_REQUESTED')?.count || 0;

    // Build 7-day chart data (fill missing days with 0)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = (dailyRevenue as any[]).find(r => r.date === dateStr);
      chartData.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        date: dateStr,
        revenue: dayData ? Number(dayData.revenue) : 0,
        orders: dayData ? Number(dayData.orders) : 0,
      });
    }

    return {
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: Number(revenue._sum.totalAmount) || 0,
        pendingOrders,
        deliveredOrders: Number(deliveredOrders),
        cancelledOrders: Number(cancelledOrders),
        returnRequested: Number(returnRequested),
        lowStock: lowStockVariants,
      },
      statusBreakdown,
      recentOrders,
      chartData,
    };
  }
}
