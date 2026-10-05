import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { DtdcService } from './dtdc.service';
import { ShippingController } from './shipping.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, DtdcService],
  exports: [ShippingService, DtdcService],
})
export class ShippingModule {}

