import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const usersToSeed = [
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

async function main() {
  console.log('Seeding database users...');
  for (const userData of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });
    console.log(
      `Upserted user: ${user.firstName} ${user.lastName} (${user.email})`,
    );
  }
  console.log('Database users seeded successfully.');
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
      await pool.end();
    })
    .catch(async (e) => {
      console.error('Error during database seeding:', e);
      await prisma.$disconnect();
      await pool.end();
      process.exit(1);
    });
}
