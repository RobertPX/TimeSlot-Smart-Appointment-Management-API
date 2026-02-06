import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAvailabilityDto, userId: string) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const professional = await this.prisma.professional.findUnique({
      where: { userId },
    });

    if (!professional) {
      throw new ForbiddenException('User is not a professional');
    }

    const overlapping = await this.prisma.availability.findMany({
      where: {
        professionalId: professional.id,
        dayOfWeek: dto.dayOfWeek,
      },
    });

    const hasOverlap = overlapping.some(
      (a) => dto.startTime < a.endTime && dto.endTime > a.startTime,
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'Availability overlaps with an existing slot',
      );
    }

    return this.prisma.availability.create({
      data: {
        professionalId: professional.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async findByProfessional(professionalId: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
    });

    if (!professional) {
      throw new NotFoundException('Professional not found');
    }

    return this.prisma.availability.findMany({
      where: { professionalId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async delete(id: string, userId: string) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.professional.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own availability',
      );
    }

    await this.prisma.availability.delete({ where: { id } });

    return { message: 'Availability deleted' };
  }
}
