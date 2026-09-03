"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const queue = new bullmq_1.Queue('projects-sync', { connection: { host: 'localhost', port: 6379 } });
async function check() {
    const failed = await queue.getFailed(0, 10);
    console.log('Failed:', failed.map(j => ({ id: j.id, err: j.failedReason, time: new Date(j.timestamp).toISOString() })));
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=check-bullmq.js.map