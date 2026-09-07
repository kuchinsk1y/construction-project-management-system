import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConfigService } from '@nestjs/config';
export interface ProjectSyncJobData {
    projectId: string;
    action: string;
}
export declare class ProjectsSyncConsumer extends WorkerHost {
    private readonly prisma;
    private readonly sheetsService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, sheetsService: GoogleSheetsService, config: ConfigService);
    process(job: Job<ProjectSyncJobData, any, string>): Promise<any>;
}
