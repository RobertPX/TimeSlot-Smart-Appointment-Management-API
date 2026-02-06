import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  professional: {
    findUnique: jest.fn(),
  },
  availability: {
    findMany: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = {
      professionalId: 'prof-1',
      date: '2026-12-15',
      startTime: '10:00',
      endTime: '10:30',
    };
    const clientId = 'client-1';

    it('should reject if startTime >= endTime', async () => {
      await expect(
        service.create({ ...dto, startTime: '11:00', endTime: '10:00' }, clientId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if date is in the past', async () => {
      await expect(
        service.create({ ...dto, date: '2020-01-01' }, clientId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if professional not found', async () => {
      mockPrisma.professional.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, clientId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if outside availability', async () => {
      mockPrisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        active: true,
      });
      mockPrisma.availability.findMany.mockResolvedValue([
        { startTime: '14:00', endTime: '17:00' },
      ]);

      await expect(service.create(dto, clientId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject conflicting appointments', async () => {
      mockPrisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        active: true,
      });
      mockPrisma.availability.findMany.mockResolvedValue([
        { startTime: '09:00', endTime: '17:00' },
      ]);

      const mockTx = {
        appointment: {
          findMany: jest.fn().mockResolvedValue([
            { startTime: '09:45', endTime: '10:15', status: 'CONFIRMED' },
          ]),
          create: jest.fn(),
        },
      };
      mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await expect(service.create(dto, clientId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create appointment when all validations pass', async () => {
      mockPrisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        active: true,
      });
      mockPrisma.availability.findMany.mockResolvedValue([
        { startTime: '09:00', endTime: '17:00' },
      ]);

      const created = { id: 'appt-1', ...dto, clientId, status: 'CONFIRMED' };
      const mockTx = {
        appointment: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue(created),
        },
      };
      mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      const result = await service.create(dto, clientId);
      expect(result).toEqual(created);
    });
  });

  describe('cancel', () => {
    it('should reject if appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.cancel('appt-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if already cancelled', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        clientId: 'user-1',
        status: 'CANCELLED',
        professional: { userId: 'prof-user-1' },
      });

      await expect(service.cancel('appt-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
