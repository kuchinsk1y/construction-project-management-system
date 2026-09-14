const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const milestones = await prisma.milestone.findMany({
    where: { projectId: 'cm11w0e4c000fvg3m9t138407' },
    include: {
      workTypes: true
    }
  });

  for (const m of milestones) {
    console.log(`Milestone: ${m.km} (ID: ${m.id}) - %: ${m.percentage}, Inv%: ${m.invoicingPercentage}`);
    console.log(`  Works count: ${m.workTypes.length}`);
    for (const wt of m.workTypes) {
      console.log(`    Work: ${wt.name} - Actual: ${wt.actualQuantity}, Total: ${wt.totalQuantity}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
