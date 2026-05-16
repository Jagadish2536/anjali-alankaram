import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Controller('uploads')
export class UploadsController {
  private s3: AWS.S3;

  constructor(private config: ConfigService) {
    this.s3 = new AWS.S3({
      region: this.config.get('AWS_REGION'),
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const bucket = this.config.get('AWS_S3_BUCKET');
    const key = `products/${uuidv4()}-${file.originalname}`;

    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    // Return the public URL
    return {
      url: `https://${bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`
    };
  }
}
