"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const queue = new bullmq_1.Queue('projects-sync', { connection: { host: 'localhost', port: 6379 } });
async function main() {
    const res = await fetch('http://localhost:3000/projects');
    const projects = await res.json();
    console.log(`Found ${projects.length} projects. Dispatching sync jobs...`);
    for (const p of projects) {
        await queue.add('sync', { projectId: p.id, action: 'update' });
    }
    console.log('All jobs dispatched!');
}
main().then(() => { setTimeout(() => process.exit(0), 1000); }).catch(console.error);
//# sourceMappingURL=sync-all-projects.js.map