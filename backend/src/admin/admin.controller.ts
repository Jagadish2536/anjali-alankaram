import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  private costExplorer: CostExplorerClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    const clientConfig: any = {
      region: 'us-east-1', // Cost Explorer API is global, always us-east-1
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.costExplorer = new CostExplorerClient(clientConfig);
  }

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

  @Get('billing')
  @ApiOperation({ summary: 'Get AWS billing summary for last 12 months' })
  async getAwsBilling() {
    const activeKey = this.config.get<string>('AWS_ACCESS_KEY_ID') || '';
    console.log(`[AWS Billing] Request received. Active Access Key: ${activeKey ? activeKey.substring(0, 8) + '...' : '(none/empty)'}`);
    try {
      // Build last 12 months worth of monthly windows
      const months: { start: string; end: string; label: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        months.push({ start, end, label });
      }

      // Fetch total cost and usage per month
      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: months[0].start,
          End: months[months.length - 1].end,
        },
        Granularity: 'MONTHLY',
        Metrics: ['BlendedCost', 'UsageQuantity'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      };

      const command = new GetCostAndUsageCommand(input);
      const response = await this.costExplorer.send(command);

      const billing = (response.ResultsByTime || []).map((result) => {
        const periodStart = result.TimePeriod?.Start || '';
        const d = new Date(periodStart + 'T00:00:00Z');
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        const services = (result.Groups || []).map((g) => ({
          name: g.Keys?.[0] || 'Other',
          cost: Number(g.Metrics?.BlendedCost?.Amount || 0),
          unit: g.Metrics?.BlendedCost?.Unit || 'USD',
        })).filter(s => s.cost > 0).sort((a, b) => b.cost - a.cost);

        const totalCost = services.reduce((sum, s) => sum + s.cost, 0);

        return {
          period: periodStart,
          label,
          totalCost: Number(totalCost.toFixed(4)),
          currency: 'USD',
          services,
        };
      });

      const grandTotal = billing.reduce((sum, b) => sum + b.totalCost, 0);
      const currentMonthCost = billing[billing.length - 1]?.totalCost || 0;
      const lastMonthCost = billing[billing.length - 2]?.totalCost || 0;
      const trend = lastMonthCost > 0
        ? Number((((currentMonthCost - lastMonthCost) / lastMonthCost) * 100).toFixed(1))
        : 0;

      return {
        success: true,
        summary: {
          grandTotal: Number(grandTotal.toFixed(4)),
          currentMonthCost: Number(currentMonthCost.toFixed(4)),
          lastMonthCost: Number(lastMonthCost.toFixed(4)),
          trend,
          currency: 'USD',
          accountId: this.config.get('AWS_ACCOUNT_ID') || null,
          region: this.config.get('AWS_REGION') || 'ap-south-2',
        },
        billing,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to fetch billing data',
        billing: [],
        summary: null,
      };
    }
  }
}
