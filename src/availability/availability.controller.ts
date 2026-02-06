import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create availability slot (professional only)' })
  create(
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.availabilityService.create(dto, userId);
  }

  @Get(':professionalId')
  @ApiOperation({ summary: 'Get availability for a professional' })
  findByProfessional(@Param('professionalId') professionalId: string) {
    return this.availabilityService.findByProfessional(professionalId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete availability slot (professional only)' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.availabilityService.delete(id, userId);
  }
}
