import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address or 10-digit phone number',
  })
  @IsNotEmpty()
  @IsString()
  emailOrPhone: string;
}
