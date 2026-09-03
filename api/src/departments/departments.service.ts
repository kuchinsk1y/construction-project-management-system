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
