import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createByAdmin(dto: CreateUserAdminDto) {
    const { email, phone, password, name, role } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone number must be provided');
    }

    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictException('Email is already registered');
    }

    if (phone) {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const existing = await this.prisma.user.findUnique({ where: { phone: formattedPhone } });
      if (existing) throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const formattedPhone = phone ? (phone.startsWith('+91') ? phone : `+91${phone}`) : null;

    return this.prisma.user.create({
      data: {
        email: email || null,
        phone: formattedPhone,
        password: passwordHash,
        name: name || null,
        role: role || Role.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateByAdmin(userId: string, dto: UpdateUserAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;

    if (dto.email !== undefined) {
      const email = dto.email || null;
      if (email && email !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictException('Email is already registered');
      }
      updateData.email = email;
    }

    if (dto.phone !== undefined) {
      const phone = dto.phone || null;
      const formattedPhone = phone ? (phone.startsWith('+91') ? phone : `+91${phone}`) : null;
      if (formattedPhone && formattedPhone !== user.phone) {
        const existing = await this.prisma.user.findUnique({ where: { phone: formattedPhone } });
        if (existing) throw new ConflictException('Phone number is already registered');
      }
      updateData.phone = formattedPhone;
    }

    if (dto.password !== undefined && dto.password !== '') {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteByAdmin(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const orderCount = await this.prisma.order.count({ where: { userId } });
    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete customer because they have order history. Please deactivate them instead.');
    }

    return this.prisma.user.delete({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
      },
    });
  }

  async updateProfile(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
      }
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async addAddress(userId: string, dto: any) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: { ...dto, userId },
    });
  }

  async updateAddress(id: string, userId: string, dto: any) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAddress(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');

    return this.prisma.address.delete({
      where: { id },
    });
  }
}
