import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private s3: S3;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3({
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION', 'ap-south-1'),
    });
    this.bucket = this.config.get('AWS_S3_BUCKET', 'anjali-alankaram-assets');
  }

  async getPresignedUrl(filename: string, contentType: string) {
    const ext = path.extname(filename);
    const key = `uploads/${uuidv4()}${ext}`;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: 300, // 5 minutes
      ContentType: contentType,
      ACL: 'public-read',
    };

    try {
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      const publicUrl = `https://${this.bucket}.s3.${this.config.get('AWS_REGION', 'ap-south-1')}.amazonaws.com/${key}`;
      return { uploadUrl: url, publicUrl, key };
    } catch (error) {
      throw new BadRequestException('Could not generate pre-signed URL');
    }
  }
}
