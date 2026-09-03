"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const prisma = new client_1.PrismaClient();
const queue = new bullmq_1.Queue('projects-sync', { connection: { host: 'localhost', port: 6379 } });
async function main() {
    const project = await prisma.projects.findFirst();
    const contractor = await prisma.contractors.findFirst({ where: { name: 'rewerwe' } });
    if (!project || !contractor)
        return;
    console.log(`Updating project ${project.name} to contractor ${contractor.name} (${contractor.tax_number})`);
    await prisma.projects.update({
        where: { id: project.id },
        data: { contractors: { connect: { id: contractor.id } } }
    });
    await queue.add('sync', { projectId: project.id, action: 'update' });
    console.log('Job dispatched.');
}
main().then(() => { setTimeout(() => process.exit(0), 1000); }).catch(console.error);
//# sourceMappingURL=test-project-update.js.map