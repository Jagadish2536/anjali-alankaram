import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, description: 'Role of the user' })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
