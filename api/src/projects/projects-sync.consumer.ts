import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConfigService } from '@nestjs/config';

export interface ProjectSyncJobData {
  projectId: string;
  action: string;
}

@Processor('projects-sync')
export class ProjectsSyncConsumer extends WorkerHost {
  private readonly logger = new Logger(ProjectsSyncConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheetsService: GoogleSheetsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ProjectSyncJobData, any, string>): Promise<any> {
    const { projectId, action } = job.data;
    this.logger.log(
      `Processing project sync job: id=${projectId}, action=${action}`,
    );

    // Since we don't sync deletion for now:
    if (action === 'delete') {
      this.logger.log(`Sync action for delete is skipped per configuration.`);
      return;
    }

    // 1. Fetch project data from DB
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
      this.logger.warn(
        `Project not found in DB: id=${projectId}. Sync skipped.`,
      );
      return;
    }

    if (project.deleted_at) {
      this.logger.log(`Project ${projectId} is soft-deleted. Sync skipped.`);
      return;
    }

    // 2. Prepare spreadsheet info from ConfigService
    const spreadsheetId = this.config.getOrThrow<string>(
      'PROJECTS_SPREADSHEET_ID',
    );
    const sheetName = this.config.getOrThrow<string>('PROJECTS_SHEET_NAME');

    // 3. Prepare data mapping according to the headers
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
      pin: project.pin_url ?? '',
      manager: managerName,
      power: project.power ? project.power.toNumber() : '',
      dokumentationUrl: project.dokumentation_url ?? '',
      country: project.country,
      status: project.status,
      dateFromFact,
      dateToFact,
      warrantyPercent: project.warranty_percent ? project.warranty_percent.toNumber() : '',
    };

    // Find the row number
    const rowIndex = await this.sheetsService.findRowIndexById(
      spreadsheetId,
      sheetName,
      project.id,
    );

    if (rowIndex) {
      this.logger.log(
        `Updating existing row ${rowIndex} in Google Sheets for project ${project.id}`,
      );
      await this.sheetsService.updateRow(
        spreadsheetId,
        sheetName,
        rowIndex,
        syncData,
      );
    } else {
      this.logger.log(
        `Appending new row to Google Sheets for project ${project.id}`,
      );
      await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
    }
  }
}
