import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'customer@example.com', description: 'User email address' })
  @IsEmail()
  email: string;
}
