import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');

    // Automatic slow query logging
    const slowThreshold = process.env.NODE_ENV === 'production' ? 250 : 500;
    (this as any).$on('query', (e: any) => {
      if (e.duration >= slowThreshold) {
        this.logger.warn(`🐌 Slow DB query (${e.duration}ms): ${e.query} | Params: ${e.params}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const models = Object.keys(this).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$'),
    );
    await Promise.all(models.map((model) => (this as any)[model].deleteMany()));
  }
}
