import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.projects.findMany({
    select: { id: true, name: true, status: true, deleted_at: true },
  });
  console.log(projects);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
