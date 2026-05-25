import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, ConfigModule, PaymentsModule],
  controllers: [AdminController],
})
export class AdminModule {}
