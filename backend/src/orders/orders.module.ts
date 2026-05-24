import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatusHistoryService } from './order-status-history.service';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, CartModule, PaymentsModule, ShippingModule, NotificationsModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStatusHistoryService, InventoryService],
  exports: [OrdersService, OrderStatusHistoryService, InventoryService],
})
export class OrdersModule {}
