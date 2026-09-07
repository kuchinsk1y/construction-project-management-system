"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const projects = await prisma.projects.findMany({
        select: { id: true, name: true, status: true, deleted_at: true },
    });
    console.log(projects);
}
main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check-projects.js.map