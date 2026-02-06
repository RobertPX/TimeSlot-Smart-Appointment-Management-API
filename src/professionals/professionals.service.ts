import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProfessionalDto } from './dto/create-professional.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfessionalDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.professional.findUnique({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException('User is already a professional');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: dto.userId },
        data: { role: Role.PROFESSIONAL },
      });

      return tx.professional.create({
        data: {
          userId: dto.userId,
          specialty: dto.specialty,
        },
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.professional.findMany({
      where: { active: true },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        availability: true,
      },
    });

    if (!professional) {
      throw new NotFoundException('Professional not found');
    }

    return professional;
  }
}
