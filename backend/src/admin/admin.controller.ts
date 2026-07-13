import { Controller, Get, Post, Body, Query, Param, UseGuards, OnModuleInit, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
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
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PaymentsService } from '../payments/payments.service';
import { InventoryService } from '../orders/inventory.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController implements OnModuleInit {
  private readonly logger = new Logger(AdminController.name);
  private usdToInrRate = 83.5; // default fallback
  private costExplorer: CostExplorerClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private paymentsService: PaymentsService,
    private inventoryService: InventoryService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private auditLogService: AuditLogService,
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

  async onModuleInit() {
    await this.updateExchangeRate();
  }

  @Cron('0 1 * * 0') // Every Sunday at 1:00 AM
  async handleWeeklyExchangeRateUpdate() {
    this.logger.log('Starting scheduled weekly exchange rate update...');
    await this.updateExchangeRate();
  }

  private async updateExchangeRate() {
    try {
      this.logger.log('Fetching live USD to INR exchange rate...');
      const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
      const rate = response.data?.rates?.INR;
      if (rate && typeof rate === 'number') {
        this.usdToInrRate = rate;
        this.logger.log(`Exchange rate updated successfully. 1 USD = ${rate} INR`);
      } else {
        this.logger.warn(`Invalid response format from exchange rate API. Keeping rate: ${this.usdToInrRate}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to fetch live exchange rate: ${err.message}. Keeping rate: ${this.usdToInrRate}`);
    }
  }

  // ── Live Visitor Tracking ──────────────────────────────────────────────────
  // Public ping endpoint (no auth required — called by every frontend visitor)
  // We strip the @UseGuards at class level by overriding with a custom guard-free route
  // Note: placed ABOVE the class-level guard, so we use a Public decorator approach:
  // Since class guard applies, we instead expose via settings controller or use a separate public route
  // Actually: class has @UseGuards at controller level, so this will be admin-protected.
  // For the public ping, we'll add it to the settings controller (public) below.

  @Get('live-visitors')
  @ApiOperation({ summary: 'Get live visitor count across the site (admin only)' })
  async getLiveVisitors() {
    const siteKey = 'site:live-visitors';
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000; // extended to 5 min

    try {
      // Prune entries older than 5 minutes
      await this.redis.zremrangebyscore(siteKey, '-inf', fiveMinAgo);
      const total = await this.redis.zcard(siteKey);

      // Get all member entries for page breakdown
      const members = await this.redis.zrange(siteKey, 0, -1);
      const pageCount: Record<string, number> = {};
      members.forEach((m) => {
        // member format: "<visitorId>|<page>"
        const page = m.split('|').slice(1).join('|') || '/';
        pageCount[page] = (pageCount[page] || 0) + 1;
      });

      const topPages = Object.entries(pageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count }));

      return { total, topPages, updatedAt: new Date().toISOString() };
    } catch {
      return { total: 0, topPages: [], updatedAt: new Date().toISOString() };
    }
  }

  @Post('fix-reserved-stock')
  @ApiOperation({ summary: 'Immediately heal variants with negative reservedStock (sets to 0)' })
  async fixReservedStock() {
    await this.inventoryService.fixNegativeReservedStock();
    return { success: true, message: 'Negative reservedStock values have been reset to 0.' };
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
          status: { notIn: ['CANCELLED', 'REFUNDED', 'REFUND_INITIATED'] },
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
          AND status NOT IN ('CANCELLED', 'REFUNDED', 'REFUND_INITIATED')
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

      const USD_TO_INR = this.usdToInrRate;
      const billing = (response.ResultsByTime || []).map((result) => {
        const periodStart = result.TimePeriod?.Start || '';
        const d = new Date(periodStart + 'T00:00:00Z');
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        const services = (result.Groups || []).map((g) => {
          const costInUsd = Number(g.Metrics?.BlendedCost?.Amount || 0);
          return {
            name: g.Keys?.[0] || 'Other',
            cost: Number((costInUsd * USD_TO_INR).toFixed(2)),
            unit: 'INR',
          };
        }).filter(s => s.cost > 0).sort((a, b) => b.cost - a.cost);

        const totalCost = services.reduce((sum, s) => sum + s.cost, 0);

        // Current calendar month is Unpaid (accruing/pending payment).
        // Past months are Paid.
        const now = new Date();
        const isCurrentMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        const status = isCurrentMonth ? 'Unpaid' : 'Paid';

        return {
          period: periodStart,
          label,
          totalCost: Number(totalCost.toFixed(2)),
          currency: 'INR',
          status,
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
          grandTotal: Number(grandTotal.toFixed(2)),
          currentMonthCost: Number(currentMonthCost.toFixed(2)),
          lastMonthCost: Number(lastMonthCost.toFixed(2)),
          trend,
          currency: 'INR',
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

  @Get('msg91-balance')
  @ApiOperation({ summary: 'Get MSG91 SMS and WhatsApp balance' })
  async getMsg91Balance() {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const whatsappSender = this.config.get<string>('MSG91_WHATSAPP_SENDER');

    if (!authKey) {
      return {
        success: false,
        error: 'MSG91_AUTH_KEY is not configured',
      };
    }

    let accountBalance = null;
    let whatsappBalance = null;
    let errorMsg = null;

    try {
      const accountRes = await axios.get('https://control.msg91.com/api/v1/account', {
        headers: { authkey: authKey },
        timeout: 5000,
      });
      accountBalance = accountRes.data?.cash_credits || 0;
    } catch (err: any) {
      this.logger.error(`Failed to fetch MSG91 account balance: ${err.message}`);
      errorMsg = `Account Balance Error: ${err.message}`;
    }

    if (whatsappSender) {
      try {
        const cleanSender = whatsappSender.replace(/\D/g, '');
        const waRes = await axios.post(
          'https://control.msg91.com/api/v5/subscriptions/fetchPrepaidBalance',
          {
            integrated_number: cleanSender,
            service: 'whatsapp',
          },
          {
            headers: {
              authkey: authKey,
              'content-type': 'application/json',
            },
            timeout: 5000,
          },
        );
        
        if (waRes.data && waRes.data.status === 'success' && waRes.data.data) {
          whatsappBalance = {
            balance: waRes.data.data.prepaid_balance ?? 0,
            currency: 'INR'
          };
        } else {
          whatsappBalance = {
            balance: waRes.data?.prepaid_balance ?? 0,
            currency: 'INR'
          };
        }
      } catch (err: any) {
        this.logger.error(`Failed to fetch MSG91 WhatsApp balance: ${err.message}`);
        errorMsg = errorMsg 
          ? `${errorMsg} | WhatsApp Balance Error: ${err.message}` 
          : `WhatsApp Balance Error: ${err.message}`;
      }
    }

    return {
      success: true,
      accountBalance,
      whatsappBalance,
      whatsappSenderConfigured: !!whatsappSender,
      whatsappSender,
      error: errorMsg,
      billingGuide: {
        title: 'How to view detailed bills, invoices & recharge history',
        steps: [
          'Log in to your MSG91 Dashboard.',
          'Click the dropdown menu next to your username (top-left).',
          'Select "Transaction Logs".',
          'Click on "Invoice & Ledger" at the top-right to view all recharges, detailed billing statements, and download invoices.'
        ]
      }
    };
  }

  @Get('inventory-report')
  @ApiOperation({ summary: 'Get inventory report comparing online stock vs warehouse stock' })
  async getInventoryReport() {
    // 1. Fetch all active warehouses
    const activeWarehouses = await this.prisma.warehouse.findMany({
      where: { status: 'ACTIVE' },
    });

    // 2. Fetch all active variants from active products
    const activeVariants = await this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { status: { not: 'ARCHIVED' } },
      },
    });

    // 3. Self-healing: Ensure warehouse inventory records exist for all active warehouses & active variants
    for (const wh of activeWarehouses) {
      for (const v of activeVariants) {
        await this.prisma.warehouseInventory.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: wh.id,
              variantId: v.id,
            },
          },
          update: {}, // don't overwrite if it exists
          create: {
            warehouseId: wh.id,
            variantId: v.id,
            quantity: v.stock,
            reserved: 0,
          },
        });
      }
    }

    // 4. Fetch all active variants with product + warehouse inventory, filtering out variants of archived products
    const variants = await this.prisma.productVariant.findMany({
      where: { 
        isActive: true,
        product: { status: { not: 'ARCHIVED' } }
      },
      include: {
        product: {
          select: {
            name: true,
            status: true,
            category: { select: { name: true } },
          },
        },
        warehouseInventory: {
          select: { quantity: true, reserved: true },
        },
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: 'asc' },
        { color: 'asc' },
      ],
    });

    const rows = variants.map((v) => {
      const warehouseStock = v.warehouseInventory.reduce(
        (sum, wi) => sum + wi.quantity,
        0,
      );
      const onlineStock = v.stock;
      const reservedStock = v.reservedStock;
      const availableStock = Math.max(0, onlineStock - reservedStock);
      const isMatch = onlineStock === warehouseStock;

      return {
        productName: v.product.name,
        category: v.product.category?.name || '',
        productStatus: v.product.status,
        sku: v.sku,
        size: v.size,
        color: v.color || '',
        colorHex: v.colorHex || '',
        onlineStock,
        reservedStock,
        availableStock,
        warehouseStock,
        isMatch,
        variance: warehouseStock - onlineStock,
      };
    });

    const totalVariants = rows.length;
    const mismatches = rows.filter((r) => !r.isMatch).length;
    const totalOnlineStock = rows.reduce((sum, r) => sum + r.onlineStock, 0);
    const totalWarehouseStock = rows.reduce((sum, r) => sum + r.warehouseStock, 0);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalVariants,
        mismatches,
        matches: totalVariants - mismatches,
        totalOnlineStock,
        totalWarehouseStock,
      },
      rows,
    };
  }

  @Get('orders/:id/transactions')
  @ApiOperation({ summary: 'Get payment transactions for a specific order' })
  async getOrderTransactions(@Param('id') id: string) {
    return this.paymentsService.getTransactionHistory(id);
  }

  @Get('orders/:id/payment-details')
  @ApiOperation({ summary: 'Get full payment details including Razorpay fee/tax/settlement' })
  async getOrderPaymentDetails(@Param('id') id: string) {
    return this.paymentsService.getPaymentDetails(id);
  }

  @Get('razorpay/transactions')
  @ApiOperation({ summary: 'Get all payment transactions' })
  async getRazorpayTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const skip = (page - 1) * limit;
    
    // Build query where conditions
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { gatewayRef: { contains: search, mode: 'insensitive' } },
        { failReason: { contains: search, mode: 'insensitive' } },
        {
          order: {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { phone: { contains: search } } },
            ]
          }
        }
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              status: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  @Get('razorpay/stats')
  @ApiOperation({ summary: 'Get payment and refund statistics' })
  async getRazorpayStats() {
    // 1. Total Charges (SUCCESS)
    const totalCharges = await this.prisma.paymentTransaction.aggregate({
      where: { type: 'CHARGE', status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    });

    // 2. Total Refunds (SUCCESS)
    const totalRefunds = await this.prisma.paymentTransaction.aggregate({
      where: { type: 'REFUND', status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    });

    // 3. Failed Charges
    const failedCharges = await this.prisma.paymentTransaction.count({
      where: { type: 'CHARGE', status: 'FAILED' }
    });

    // 4. Failed Refunds
    const failedRefunds = await this.prisma.paymentTransaction.count({
      where: { type: 'REFUND', status: 'FAILED' }
    });

    return {
      totalCapturedAmount: Number(totalCharges._sum.amount || 0),
      totalCapturedCount: totalCharges._count || 0,
      totalRefundedAmount: Number(totalRefunds._sum.amount || 0),
      totalRefundedCount: totalRefunds._count || 0,
      failedChargesCount: failedCharges,
      failedRefundsCount: failedRefunds,
    };
  }

  @Get('razorpay/bank-details')
  @ApiOperation({ summary: 'Get bank/settlement details synced from admin settings' })
  async getRazorpayBankDetails() {
    const settings = await this.prisma.storeSettings.findFirst({
      select: {
        bankName: true,
        accountNumber: true,
        ifscCode: true,
        accountHolderName: true,
        updatedAt: true,
      },
    });

    // Determine settlement "active" status — has there been a successful capture in last 30 days?
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCapture = await this.prisma.paymentTransaction.findFirst({
      where: {
        type: 'CHARGE',
        status: 'SUCCESS',
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, amount: true },
    });

    // Also get the most recent successful charge ever (for "last settlement" date)
    const lastCapture = await this.prisma.paymentTransaction.findFirst({
      where: { type: 'CHARGE', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, amount: true },
    });

    return {
      bankName: (settings as any)?.bankName || null,
      accountNumber: (settings as any)?.accountNumber || null,
      ifscCode: (settings as any)?.ifscCode || null,
      accountHolderName: (settings as any)?.accountHolderName || null,
      lastUpdated: (settings as any)?.updatedAt || null,
      settlementActive: !!recentCapture,
      lastSettlementDate: lastCapture?.createdAt || null,
      lastSettlementAmount: lastCapture?.amount ? Number(lastCapture.amount) : null,
    };
  }

  @Post('razorpay/refund')
  @ApiOperation({ summary: 'Manually trigger a refund for an order' })
  async triggerManualRefund(
    @Body() body: { orderId: string; amount?: number },
  ) {
    if (!body.orderId) {
      throw new BadRequestException('orderId is required');
    }
    
    const refund = await this.paymentsService.processRefund(body.orderId, body.amount);
    
    // Log in order status history
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "order_status_history" ("id","orderId","fromStatus","toStatus","actorRole","notes","metadata","createdAt")
       VALUES (gen_random_uuid(),$1,'CANCELLED'::"OrderStatus",'REFUND_INITIATED'::"OrderStatus",'ADMIN',
       'Manual refund triggered from Razorpay Manager',$2::jsonb,NOW())`,
      body.orderId, JSON.stringify({ refundId: refund.id, amount: body.amount })
    );

    return {
      success: true,
      message: 'Refund initiated successfully',
      refundId: refund.id,
    };
  }

  // ── Razorpay Live API Endpoints ─────────────────────────────────────────────

  @Get('razorpay/account-balance')
  @ApiOperation({ summary: 'Get Razorpay account/reserve balance directly from Razorpay API' })
  async getRazorpayAccountBalance() {
    try {
      const client = await this.paymentsService.getPublicRazorpayClient();
      if (!client) return { success: false, error: 'Razorpay not configured' };

      // Razorpay provides balance via settlements API endpoint (account balance)
      // Use axios to call the Razorpay balance API directly
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      const response = await axios.get('https://api.razorpay.com/v1/balance', {
        auth: { username: keyId, password: keySecret },
        timeout: 8000,
      });

      return {
        success: true,
        balance: response.data,
      };
    } catch (err: any) {
      this.logger.warn(`Razorpay balance fetch failed: ${err.message}`);
      return {
        success: false,
        error: err?.response?.data?.error?.description || err.message || 'Failed to fetch balance',
      };
    }
  }

  @Get('razorpay/live-payments')
  @ApiOperation({ summary: 'Fetch payments directly from Razorpay API' })
  async getRazorpayLivePayments(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip = 0,
    @Query('count') count = 20,
  ) {
    try {
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      if (!keyId || !keySecret) return { success: false, error: 'Razorpay not configured', items: [] };

      const params: any = { count: Math.min(Number(count), 100), skip: Number(skip) };
      if (from) params.from = Math.floor(new Date(from).getTime() / 1000);
      if (to) params.to = Math.floor(new Date(to).getTime() / 1000);

      const response = await axios.get('https://api.razorpay.com/v1/payments', {
        auth: { username: keyId, password: keySecret },
        params,
        timeout: 10000,
      });

      const items = (response.data?.items || []).map((p: any) => ({
        id: p.id,
        entity: p.entity,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        method: p.method,
        orderId: p.order_id,
        description: p.description,
        bank: p.bank,
        wallet: p.wallet,
        vpa: p.vpa,
        email: p.email,
        contact: p.contact,
        fee: p.fee ? p.fee / 100 : 0,
        tax: p.tax ? p.tax / 100 : 0,
        errorCode: p.error_code,
        errorDescription: p.error_description,
        acquirerData: p.acquirer_data,
        createdAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
        capturedAt: p.captured_at ? new Date(p.captured_at * 1000).toISOString() : null,
        international: p.international,
        refundStatus: p.refund_status,
        amountRefunded: p.amount_refunded ? p.amount_refunded / 100 : 0,
        captured: p.captured,
      }));

      return {
        success: true,
        count: response.data?.count || items.length,
        items,
      };
    } catch (err: any) {
      this.logger.warn(`Razorpay live payments fetch failed: ${err.message}`);
      return {
        success: false,
        error: err?.response?.data?.error?.description || err.message || 'Failed to fetch payments',
        items: [],
      };
    }
  }

  @Get('razorpay/settlements')
  @ApiOperation({ summary: 'Fetch settlements directly from Razorpay API' })
  async getRazorpaySettlements(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip = 0,
    @Query('count') count = 20,
  ) {
    try {
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      if (!keyId || !keySecret) return { success: false, error: 'Razorpay not configured', items: [] };

      const params: any = { count: Math.min(Number(count), 100), skip: Number(skip) };
      if (from) params.from = Math.floor(new Date(from).getTime() / 1000);
      if (to) params.to = Math.floor(new Date(to).getTime() / 1000);

      const response = await axios.get('https://api.razorpay.com/v1/settlements', {
        auth: { username: keyId, password: keySecret },
        params,
        timeout: 10000,
      });

      const items = (response.data?.items || []).map((s: any) => ({
        id: s.id,
        entity: s.entity,
        amount: s.amount / 100,
        fees: s.fees ? s.fees / 100 : 0,
        tax: s.tax ? s.tax / 100 : 0,
        utr: s.utr,
        description: s.description,
        createdAt: s.created_at ? new Date(s.created_at * 1000).toISOString() : null,
        ondemand: s.ondemand,
        status: s.status,
      }));

      return {
        success: true,
        count: response.data?.count || items.length,
        items,
      };
    } catch (err: any) {
      this.logger.warn(`Razorpay settlements fetch failed: ${err.message}`);
      return {
        success: false,
        error: err?.response?.data?.error?.description || err.message || 'Failed to fetch settlements',
        items: [],
      };
    }
  }

  @Post('razorpay/refund-payment')
  @ApiOperation({ summary: 'Refund a specific Razorpay payment by payment ID' })
  async refundRazorpayPayment(
    @Body() body: { paymentId: string; amount?: number; reason?: string },
  ) {
    if (!body.paymentId) throw new BadRequestException('paymentId is required');
    try {
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      const refundBody: any = {};
      if (body.amount) refundBody.amount = Math.round(body.amount * 100);
      if (body.reason) refundBody.notes = { reason: body.reason };

      const response = await axios.post(
        `https://api.razorpay.com/v1/payments/${body.paymentId}/refund`,
        refundBody,
        { auth: { username: keyId, password: keySecret }, timeout: 10000 },
      );

      return { success: true, refund: response.data };
    } catch (err: any) {
      throw new BadRequestException(err?.response?.data?.error?.description || err.message || 'Refund failed');
    }
  }

  @Get('razorpay/payment/:paymentId')
  @ApiOperation({ summary: 'Fetch live status of a single Razorpay payment by payment ID' })
  async getRazorpayPaymentLive(@Param('paymentId') paymentId: string) {
    try {
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      if (!keyId || !keySecret) return { success: false, error: 'Razorpay not configured' };

      const response = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        auth: { username: keyId, password: keySecret },
        timeout: 8000,
      });
      const p = response.data;
      return {
        success: true,
        payment: {
          id: p.id,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          method: p.method,
          captured: p.captured,
          refundStatus: p.refund_status,
          amountRefunded: p.amount_refunded ? p.amount_refunded / 100 : 0,
          fee: p.fee ? p.fee / 100 : 0,
          tax: p.tax ? p.tax / 100 : 0,
          email: p.email,
          contact: p.contact,
          bank: p.bank,
          wallet: p.wallet,
          vpa: p.vpa,
          acquirerData: p.acquirer_data,
          errorCode: p.error_code,
          errorDescription: p.error_description,
          orderId: p.order_id,
          description: p.description,
          createdAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error?.description || err.message || 'Failed to fetch payment',
      };
    }
  }

  @Get('razorpay/refund/:refundId')
  @ApiOperation({ summary: 'Fetch live status of a single Razorpay refund by refund ID' })
  async getRazorpayRefundLive(@Param('refundId') refundId: string) {
    try {
      const { keyId, keySecret } = await this.paymentsService.getPublicConfig();
      if (!keyId || !keySecret) return { success: false, error: 'Razorpay not configured' };

      const response = await axios.get(`https://api.razorpay.com/v1/refunds/${refundId}`, {
        auth: { username: keyId, password: keySecret },
        timeout: 8000,
      });
      const r = response.data;
      return {
        success: true,
        refund: {
          id: r.id,
          paymentId: r.payment_id,
          amount: r.amount / 100,
          currency: r.currency,
          status: r.status, // 'processed' | 'pending' | 'failed'
          speed: r.speed_processed,
          speedRequested: r.speed_requested,
          receipt: r.receipt,
          notes: r.notes,
          acquirerData: r.acquirer_data,
          batchId: r.batch_id,
          failureReason: r.failure_reason,
          createdAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : null,
          processedAt: r.processed_at ? new Date(r.processed_at * 1000).toISOString() : null,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error?.description || err.message || 'Failed to fetch refund',
      };
    }
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get all audit logs (admin only)' })
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.getLogs(Number(page), Number(limit), {
      adminId,
      action,
      entityType,
      startDate,
      endDate,
    });
  }
}
