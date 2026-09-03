import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete dependent data first
  await prisma.daily_reports.deleteMany({});
  await prisma.resource_plans.deleteMany({});
  await prisma.project_hours_plan.deleteMany({});
  await prisma.project_status_history.deleteMany({});
  await prisma.planned_expenses.deleteMany({});
  await prisma.project_budget_items.deleteMany({});
  await prisma.project_department_foremen.deleteMany({});
  await prisma.project_departments.deleteMany({});
  await prisma.milestones_invoices.deleteMany({});
  await prisma.project_work_types.deleteMany({});
  await prisma.milestones.deleteMany({});
  await prisma.projects.deleteMany({});
  await prisma.contractors.deleteMany({});
  console.log('Database cleared (except users, roles, reference data)');
}
main().then(async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}).catch(async (e) => { 
  console.error(e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1); 
});
