import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new user/customer (Admin only)' })
  async createByAdmin(@Body() dto: CreateUserAdminDto) {
    return this.usersService.createByAdmin(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user details/password (Admin only)' })
  async updateByAdmin(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.usersService.updateByAdmin(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete user account (Admin only)' })
  async deleteByAdmin(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deleteByAdmin(id, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all users/customers (Admin only)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req: any, @Body() dto: any) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  async getAddresses(@Req() req: any) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add new address' })
  async addAddress(@Req() req: any, @Body() dto: any) {
    return this.usersService.addAddress(req.user.id, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateAddress(id, req.user.id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deleteAddress(id, req.user.id);
  }
}
