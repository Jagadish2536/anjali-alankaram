import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3CleanupModule } from '../s3-cleanup/s3-cleanup.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, S3CleanupModule, EmailModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
