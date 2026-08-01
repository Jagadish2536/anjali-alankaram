import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address or 10-digit phone number',
  })
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;

  @ApiProperty({
    example: 'email',
    enum: ['email', 'sms', 'whatsapp'],
    required: false,
    description: 'Preferred OTP delivery channel',
  })
  @IsOptional()
  @IsEnum(['email', 'sms', 'whatsapp'])
  channel?: 'email' | 'sms' | 'whatsapp' = 'email';
}
