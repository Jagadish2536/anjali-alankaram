import { Module } from '@nestjs/common';
import { S3CleanupService } from './s3-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [S3CleanupService],
  exports: [S3CleanupService],
})
export class S3CleanupModule {}
