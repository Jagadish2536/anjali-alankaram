import { IsEmail, IsOptional, IsString, Length, Matches, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserAdminDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian phone number', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phone?: string;

  @ApiProperty({ example: 'newpassword123', description: 'New password (optional, min 6 characters)', required: false })
  @IsOptional()
  @IsString()
  @Length(6, 50, { message: 'Password must be between 6 and 50 characters long' })
  password?: string;

  @ApiProperty({ enum: Role, description: 'Role of the user', required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
