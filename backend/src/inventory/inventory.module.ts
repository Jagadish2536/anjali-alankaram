import { Module } from '@nestjs/common';
import { InventoryService } from '../orders/inventory.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Standalone module that exports InventoryService so it can be imported
 * by PaymentsModule (and any other module) without creating a circular
 * dependency with OrdersModule.
 */
@Module({
  imports: [PrismaModule],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
