"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const queue = new bullmq_1.Queue('projects-sync', { connection: { host: 'localhost', port: 6379 } });
async function main() {
    const pId = '7c3ac697-268e-4626-ace2-bc5fe2973d16';
    console.log('Dispatching sync for project', pId);
    const job = await queue.add('sync', { projectId: pId, action: 'update' });
    console.log('Job dispatched:', job.id);
}
main().then(() => { setTimeout(() => process.exit(0), 1000); }).catch(console.error);
//# sourceMappingURL=test-sync.js.map