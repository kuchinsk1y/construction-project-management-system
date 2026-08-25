const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const projects = await prisma.projects.findMany({
      select: { id: true, name: true, warranty_percent: true },
      take: 5,
      orderBy: { id: 'desc' }
    });
    console.dir(projects, { depth: null });
  } finally {
    await prisma.$disconnect();
  }
}

run();
