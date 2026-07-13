import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteOldLogs() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    try {
      const { count } = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: threeMonthsAgo,
          },
        },
      });
      this.logger.log(`Auto-deleted ${count} audit logs older than 3 months.`);
    } catch (err: any) {
      this.logger.error(`Failed to auto-delete old audit logs: ${err.message}`);
    }
  }

  async writeLog(params: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    errorMsg?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          metadata: params.metadata || null,
          success: params.success !== false,
          errorMsg: params.errorMsg || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  async getLogUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER', 'STOCK_MANAGER'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getLogs(
    page = 1,
    limit = 50,
    filters?: { adminId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string; success?: boolean },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.adminId) where.adminId = filters.adminId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.success !== undefined) where.success = filters.success;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (filters.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Enhance logs with admin info (name, email, role)
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        let adminUser = null;
        if (log.adminId && log.adminId !== 'SYSTEM' && log.adminId !== 'WEBHOOK') {
          adminUser = await this.prisma.user.findUnique({
            where: { id: log.adminId },
            select: { name: true, email: true, role: true },
          });
        }
        return {
          ...log,
          admin: adminUser,
        };
      }),
    );

    return {
      logs: enhancedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

