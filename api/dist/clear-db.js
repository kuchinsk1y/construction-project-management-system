"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
    throw new Error('DATABASE_URL is not set');
const pool = new pg_1.Pool({ connectionString: databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
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
//# sourceMappingURL=clear-db.js.map