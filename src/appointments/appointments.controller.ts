import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Create an appointment (client only)' })
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.create(dto, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my appointments' })
  findMy(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.appointmentsService.findMyAppointments(userId, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.appointmentsService.cancel(id, userId);
  }

  @Patch(':id/complete')
  @Roles(Role.PROFESSIONAL)
  @ApiOperation({ summary: 'Mark appointment as completed (professional only)' })
  complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.appointmentsService.complete(id, userId);
  }
}
