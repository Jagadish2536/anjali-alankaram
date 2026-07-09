import { Module } from '@nestjs/common';
import { AiImagesController } from './ai-images.controller';
import { AiImagesService } from './ai-images.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiImagesController],
  providers: [AiImagesService],
  exports: [AiImagesService],
})
export class AiImagesModule {}
