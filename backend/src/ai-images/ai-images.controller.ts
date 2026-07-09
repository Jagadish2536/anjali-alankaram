import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiImagesService } from './ai-images.service';
import { ApproveImageDto, RejectImageDto, DeleteSessionDto } from './dto/generate-images.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('AI Images')
@Controller('ai-images')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AiImagesController {
  private readonly logger = new Logger(AiImagesController.name);

  constructor(private readonly aiImagesService: AiImagesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate 4 AI product images using face + product references' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'faceImage', maxCount: 1 },
      { name: 'productImage', maxCount: 1 },
    ]),
  )
  async generateImages(
    @UploadedFiles() files: { faceImage?: Express.Multer.File[]; productImage?: Express.Multer.File[] },
    @Req() req: any,
    @Body() body: { productId?: string; customPrompt?: string },
  ) {
    const faceFile = files?.faceImage?.[0];
    const productFile = files?.productImage?.[0];

    if (!faceFile) throw new BadRequestException('faceImage is required');
    if (!productFile) throw new BadRequestException('productImage is required');

    // Validate mime types
    if (!ALLOWED_MIME.includes(faceFile.mimetype)) {
      throw new BadRequestException('faceImage must be JPG, PNG, or WEBP');
    }
    if (!ALLOWED_MIME.includes(productFile.mimetype)) {
      throw new BadRequestException('productImage must be JPG, PNG, or WEBP');
    }

    // Validate file sizes
    if (faceFile.size > MAX_FILE_SIZE) {
      throw new BadRequestException('faceImage must be under 10MB');
    }
    if (productFile.size > MAX_FILE_SIZE) {
      throw new BadRequestException('productImage must be under 10MB');
    }

    const adminId = req.user?.id;
    this.logger.log(`Admin ${adminId} generating AI images for product ${body.productId || 'new'}`);

    return this.aiImagesService.generateImages(
      faceFile.buffer,
      faceFile.mimetype,
      productFile.buffer,
      productFile.mimetype,
      adminId,
      body.productId,
      body.customPrompt,
    );
  }

  @Post('approve')
  @ApiOperation({ summary: 'Approve a generated image and move it to the product' })
  async approveImage(@Body() dto: ApproveImageDto, @Req() req: any) {
    const adminId = req.user?.id;
    return this.aiImagesService.approveImage(
      dto.sessionId,
      dto.imageKey,
      dto.productId,
      adminId,
    );
  }

  @Post('reject')
  @ApiOperation({ summary: 'Reject and delete a single generated image' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectImage(@Body() dto: RejectImageDto, @Req() req: any) {
    const adminId = req.user?.id;
    await this.aiImagesService.rejectImage(dto.sessionId, dto.imageKey, adminId);
  }

  @Delete('session')
  @ApiOperation({ summary: 'Delete an entire AI generation session and all temp images' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Body() dto: DeleteSessionDto, @Req() req: any) {
    const adminId = req.user?.id;
    await this.aiImagesService.deleteSession(dto.sessionId, adminId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get the current state of an AI image session' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.aiImagesService.getSession(sessionId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AI image generation statistics for admin dashboard' })
  async getStats() {
    return this.aiImagesService.getAiStats();
  }
}
