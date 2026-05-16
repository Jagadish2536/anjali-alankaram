import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSettings() {
    let settings = await this.prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.storeSettings.create({
        data: {
          storeName: 'Anjali Alankaram',
          supportEmail: 'support@anjalialankaram.com',
          supportPhone: '+91 9876543210'
        }
      });
    }
    return settings;
  }

  @Post()
  async updateSettings(@Body() data: any) {
    // Clean data to only include valid fields
    const { id, updatedAt, ...cleanData } = data;
    const settings = await this.prisma.storeSettings.findFirst();
    
    if (settings) {
      return this.prisma.storeSettings.update({
        where: { id: settings.id },
        data: cleanData
      });
    } else {
      return this.prisma.storeSettings.create({ data: cleanData });
    }
  }
}
