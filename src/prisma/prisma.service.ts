import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

function buildAdapter() {
  const url = process.env.DATABASE_URL;
  const isNeon = url?.includes('neon.tech');

  if (isNeon || process.env.NODE_ENV === 'production') {
    return new PrismaNeon({ connectionString: url });
  }

  return new PrismaPg({ connectionString: url });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: buildAdapter() } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
