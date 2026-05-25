import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit Indian WhatsApp number' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian WhatsApp number' })
  phone: string;
}
