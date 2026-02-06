import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, clientId: string) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const appointmentDate = new Date(dto.date);
    const now = new Date();
    if (appointmentDate < new Date(now.toISOString().split('T')[0])) {
      throw new BadRequestException('Cannot book appointments in the past');
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });

    if (!professional || !professional.active) {
      throw new NotFoundException('Professional not found or inactive');
    }

    // Check availability
    const dayOfWeek = appointmentDate.getUTCDay();
    const availability = await this.prisma.availability.findMany({
      where: {
        professionalId: dto.professionalId,
        dayOfWeek,
      },
    });

    const isWithinAvailability = availability.some(
      (slot) =>
        dto.startTime >= slot.startTime && dto.endTime <= slot.endTime,
    );

    if (!isWithinAvailability) {
      throw new BadRequestException(
        'Requested time is outside professional availability',
      );
    }

    // Check overlapping appointments (using transaction for safety)
    return this.prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.findMany({
        where: {
          professionalId: dto.professionalId,
          date: appointmentDate,
          status: AppointmentStatus.CONFIRMED,
        },
      });

      const hasConflict = overlapping.some(
        (appt) =>
          dto.startTime < appt.endTime && dto.endTime > appt.startTime,
      );

      if (hasConflict) {
        throw new BadRequestException(
          'Time slot conflicts with an existing appointment',
        );
      }

      return tx.appointment.create({
        data: {
          professionalId: dto.professionalId,
          clientId,
          date: appointmentDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          notes: dto.notes,
        },
        include: {
          professional: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      });
    });
  }

  async findMyAppointments(userId: string, role: string) {
    if (role === 'PROFESSIONAL') {
      const professional = await this.prisma.professional.findUnique({
        where: { userId },
      });

      if (!professional) {
        return [];
      }

      return this.prisma.appointment.findMany({
        where: { professionalId: professional.id },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });
    }

    return this.prisma.appointment.findMany({
      where: { clientId: userId },
      include: {
        professional: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async cancel(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (
      appointment.clientId !== userId &&
      appointment.professional.userId !== userId
    ) {
      throw new ForbiddenException(
        'You can only cancel your own appointments',
      );
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed appointments can be cancelled',
      );
    }

    // Check minimum cancellation window
    const minCancelHours = parseInt(process.env.MIN_CANCEL_HOURS || '24', 10);
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setUTCHours(hours, minutes, 0, 0);

    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < minCancelHours) {
      throw new BadRequestException(
        `Cannot cancel with less than ${minCancelHours} hours notice`,
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
  }

  async complete(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.professional.userId !== userId) {
      throw new ForbiddenException(
        'Only the professional can mark an appointment as completed',
      );
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed appointments can be completed',
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
    });
  }
}
