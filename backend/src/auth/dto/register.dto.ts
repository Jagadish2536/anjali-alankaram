import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid 10-digit Indian phone number' })
  phone: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Length(6, 50, { message: 'Password must be between 6 and 50 characters long' })
  password: string;
}
