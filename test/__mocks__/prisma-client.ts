export class PrismaClient {}
export const Role = {
  ADMIN: 'ADMIN',
  PROFESSIONAL: 'PROFESSIONAL',
  CLIENT: 'CLIENT',
} as const;
export const AppointmentStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
