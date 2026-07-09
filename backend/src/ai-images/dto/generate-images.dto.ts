import { IsString, IsOptional, IsUUID } from 'class-validator';

export class GenerateImagesDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  customPrompt?: string;
}

export class ApproveImageDto {
  @IsString()
  sessionId: string;

  @IsString()
  imageKey: string;

  @IsString()
  productId: string;
}

export class RejectImageDto {
  @IsString()
  sessionId: string;

  @IsString()
  imageKey: string;
}

export class DeleteSessionDto {
  @IsString()
  sessionId: string;
}
