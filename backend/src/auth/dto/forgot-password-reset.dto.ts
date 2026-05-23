import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address or 10-digit phone number',
  })
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;

  @ApiProperty({
    example: 'newSecurePassword123',
    description: 'New password (min 6 characters)',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 50, { message: 'Password must be between 6 and 50 characters long' })
  password: string;
}
