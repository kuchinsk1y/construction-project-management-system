"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProjectsSyncConsumer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsSyncConsumer = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const google_sheets_service_1 = require("../google-sheets/google-sheets.service");
const config_1 = require("@nestjs/config");
let ProjectsSyncConsumer = ProjectsSyncConsumer_1 = class ProjectsSyncConsumer extends bullmq_1.WorkerHost {
    prisma;
    sheetsService;
    config;
    logger = new common_1.Logger(ProjectsSyncConsumer_1.name);
    constructor(prisma, sheetsService, config) {
        super();
        this.prisma = prisma;
        this.sheetsService = sheetsService;
        this.config = config;
    }
    async process(job) {
        const { projectId, action } = job.data;
        this.logger.log(`Processing project sync job: id=${projectId}, action=${action}`);
        if (action === 'delete') {
            this.logger.log(`Sync action for delete is skipped per configuration.`);
            return;
        }
        const project = await this.prisma.projects.findUnique({
            where: { id: projectId },
            include: {
                contractors: { select: { name: true } },
                project_types: { select: { name: true } },
                users_projects_manager_idTousers: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        if (!project) {
            this.logger.warn(`Project not found in DB: id=${projectId}. Sync skipped.`);
            return;
        }
        if (project.deleted_at) {
            this.logger.log(`Project ${projectId} is soft-deleted. Sync skipped.`);
            return;
        }
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.getOrThrow('PROJECTS_SHEET_NAME');
        const managerName = project.users_projects_manager_idTousers
            ? `${project.users_projects_manager_idTousers.firstName} ${project.users_projects_manager_idTousers.lastName}`
            : '';
        const dateFrom = project.start_date_contract
            ? project.start_date_contract.toISOString().split('T')[0]
            : '';
        const dateTo = project.end_date_contract
            ? project.end_date_contract.toISOString().split('T')[0]
            : '';
        const dateFromFact = project.start_date_fact
            ? project.start_date_fact.toISOString().split('T')[0]
            : '';
        const dateToFact = project.end_date_fact
            ? project.end_date_fact.toISOString().split('T')[0]
            : '';
        const syncData = {
            id: project.id,
            contractor: project.contractors?.name ?? '',
            project: project.name,
            location: project.city
                ? `${project.city}, ${project.country}`
                : project.country,
            dateFrom,
            dateTo,
            projectType: project.project_types?.name ?? '',
            pin: '',
            manager: managerName,
            power: '',
            dokumentationUrl: project.dokumentation_url ?? '',
            country: project.country,
            status: project.status,
            dateFromFact,
            dateToFact,
        };
        const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, project.id);
        if (rowIndex) {
            this.logger.log(`Updating existing row ${rowIndex} in Google Sheets for project ${project.id}`);
            await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
        }
        else {
            this.logger.log(`Appending new row to Google Sheets for project ${project.id}`);
            await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
        }
    }
};
exports.ProjectsSyncConsumer = ProjectsSyncConsumer;
exports.ProjectsSyncConsumer = ProjectsSyncConsumer = ProjectsSyncConsumer_1 = __decorate([
    (0, bullmq_1.Processor)('projects-sync'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_sheets_service_1.GoogleSheetsService,
        config_1.ConfigService])
], ProjectsSyncConsumer);
//# sourceMappingURL=projects-sync.consumer.js.map