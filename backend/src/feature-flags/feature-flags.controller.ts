import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly flagsService: FeatureFlagsService) {}

  @Get('check')
  @ApiOperation({ summary: 'Evaluate a feature flag status' })
  async check(
    @Query('key') key: string,
    @Query('userId') userId?: string,
  ) {
    if (!key) throw new BadRequestException('key is required');
    const enabled = await this.flagsService.isEnabled(key, userId);
    return { key, enabled };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feature flags (Admin-only)' })
  async getAll() {
    return this.flagsService.getAllFlags();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a feature flag (Admin-only)' })
  async setFlag(
    @Body() body: { key: string; enabled: boolean; rolloutPct?: number; description?: string },
  ) {
    if (!body.key) throw new BadRequestException('key is required');
    return this.flagsService.setFlag(
      body.key,
      body.enabled,
      body.rolloutPct ?? 100,
      body.description ?? '',
    );
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag (Admin-only)' })
  async deleteFlag(@Param('key') key: string) {
    const deleted = await this.flagsService.deleteFlag(key);
    if (!deleted) throw new BadRequestException('Failed to delete flag');
  }
}
