import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private sheetsService: GoogleSheetsService,
  ) {}

  async findAll() {
    const list = await this.prisma.departments.findMany({
      orderBy: { id: 'asc' },
    });
    return list.map((d) => ({
      ...d,
      id: Number(d.id),
    }));
  }

  async create(data: {
    name: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
  }) {
    const created = await this.prisma.departments.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon ?? 'Folder',
        is_active: data.is_active ?? true,
      },
    });

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('DEPARTMENTS_SHEET_NAME', 'Dzialy');
    
    const syncData = {
      id: Number(created.id),
      name: created.name,
      description: created.description ?? '',
      icon: created.icon,
      is_active: created.is_active ? 'TRUE' : 'FALSE',
    };

    try {
      await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
    } catch (error) {
      await this.prisma.departments.delete({ where: { id: created.id } });
      
      const errMsg = error instanceof Error ? error.message : String(error);
      const errorsSheet = this.config.get<string>('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
      try {
        await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
          timestamp: new Date().toISOString(),
          action: 'CREATE_DEPARTMENT',
          error_message: errMsg,
          payload: JSON.stringify(syncData),
        });
      } catch (logErr) {}
      throw new InternalServerErrorException('Nie udało się zapisać działu w Google Sheets');
    }

    return { ...created, id: Number(created.id) };
  }

  async update(
    id: bigint,
    data: { name?: string; description?: string; icon?: string; is_active?: boolean },
  ) {
    const existing = await this.prisma.departments.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('DEPARTMENTS_SHEET_NAME', 'Dzialy');

    const syncData = {
      id: Number(id),
      name: data.name ?? existing.name,
      description: data.description !== undefined ? (data.description ?? '') : (existing.description ?? ''),
      icon: data.icon ?? existing.icon,
      is_active: data.is_active !== undefined ? (data.is_active ? 'TRUE' : 'FALSE') : (existing.is_active ? 'TRUE' : 'FALSE'),
    };

    try {
      const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, id.toString());
      if (rowIndex) {
        await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
      } else {
        await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errorsSheet = this.config.get<string>('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
      try {
        await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
          timestamp: new Date().toISOString(),
          action: 'UPDATE_DEPARTMENT',
          error_message: errMsg,
          payload: JSON.stringify(syncData),
        });
      } catch (logErr) {}
      throw new InternalServerErrorException('Nie udało się zaktualizować działu w Google Sheets');
    }

    const updated = await this.prisma.departments.update({
      where: { id },
      data,
    });
    return { ...updated, id: Number(updated.id) };
  }

  async remove(id: bigint) {
    try {
      const workTypesCount = await this.prisma.project_work_types.count({
        where: { department_id: id },
      });
      
      const foremenCount = await this.prisma.project_department_foremen.count({
        where: { department_id: id },
      });

      if (workTypesCount > 0 || foremenCount > 0) {
        throw new BadRequestException(
          'Nie można usunąć działu, ponieważ jest on przypisany do projektów.',
        );
      }

      await this.prisma.departments.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Nie można usunąć działu, ponieważ wystąpił problem ze spójnością danych.',
          );
        }
      }
      throw error;
    }
  }
}
