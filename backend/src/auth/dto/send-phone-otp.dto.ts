import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPhoneOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'User 10-digit phone number or E.164 phone string' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'sms', enum: ['sms', 'whatsapp'], required: false })
  @IsOptional()
  @IsEnum(['sms', 'whatsapp'])
  channel?: 'sms' | 'whatsapp' = 'sms';
}
