import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.seedUsers();
  }

  private async seedUsers(): Promise<void> {
    const usersToSeed = [
      {
        email: 'tymur.kuchynskyi@ispik.eu',
        firstName: 'Tymur',
        lastName: 'Kuchynskyi',
        middleNames: 'Fullstack Developer',
        position: 'Administrator',
        phoneNumber: '+48787368874',
        telegramId: 784892922n,
        roles: ['admin'],
        isActive: true,
      },
      {
        email: 'vitalii.vykhrystiuk@ispik.eu',
        firstName: 'Vitalii',
        lastName: 'Vykhrystiuk',
        middleNames: 'Kierownik działu IT',
        position: 'Kierownik działu IT',
        phoneNumber: '+48575503390',
        telegramId: 1645624128n,
        roles: ['admin'],
        isActive: true,
      },
    ];

    try {
      for (const userData of usersToSeed) {
        await this.user.upsert({
          where: { email: userData.email },
          update: userData,
          create: userData,
        });
      }
      console.log('Admin users seeded successfully on startup.');
    } catch (error) {
      console.error('Failed to seed admin users on startup:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
