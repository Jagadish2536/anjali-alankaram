import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { S3CleanupModule } from '../s3-cleanup/s3-cleanup.module';
import { ImageOptimizerService } from './image-optimizer.service';

@Module({
  imports: [S3CleanupModule],
  controllers: [UploadsController],
  providers: [UploadsService, ImageOptimizerService],
  exports: [UploadsService, ImageOptimizerService],
})
export class UploadsModule {}
