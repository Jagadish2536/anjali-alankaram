import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, ShippingModule, InventoryModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
