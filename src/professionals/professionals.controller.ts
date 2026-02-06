import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service.js';
import { CreateProfessionalDto } from './dto/create-professional.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a professional profile (admin only)' })
  create(@Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active professionals' })
  findAll() {
    return this.professionalsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get professional by ID with availability' })
  findOne(@Param('id') id: string) {
    return this.professionalsService.findOne(id);
  }
}
