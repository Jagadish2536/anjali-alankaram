import { Controller, Post, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

@Controller('uploads')
export class UploadsController {
  private s3: AWS.S3;

  constructor(private config: ConfigService) {
    // Only initialize S3 if not in local upload driver mode
    const uploadDriver = this.config.get('UPLOAD_DRIVER') || 's3';
    if (uploadDriver !== 'local') {
      // When running on ECS, AWS.S3 automatically uses the IAM Task Role credentials
      // so explicit access keys are not required.
      this.s3 = new AWS.S3({
        region: this.config.get('AWS_REGION'),
      });
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const uploadDriver = this.config.get('UPLOAD_DRIVER') || 's3';
    const isLocal = uploadDriver === 'local';

    if (isLocal) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'products');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const host = req.get('host');
      const protocol = req.protocol;
      const url = `${protocol}://${host}/api/v1/uploads/products/${fileName}`;

      return { url };
    }

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

