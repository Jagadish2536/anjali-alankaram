import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit Indian WhatsApp number' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid WhatsApp number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code: string;
}
