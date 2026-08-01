import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'User phone number' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
