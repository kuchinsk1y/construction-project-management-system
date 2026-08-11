import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

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
    is_active?: boolean;
  }) {
    const created = await this.prisma.departments.create({
      data: {
        name: data.name,
        description: data.description,
        is_active: data.is_active ?? true,
      },
    });
    return { ...created, id: Number(created.id) };
  }

  async update(
    id: bigint,
    data: { name?: string; description?: string; is_active?: boolean },
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
      await this.prisma.project_work_types.deleteMany({
        where: { department_id: id },
      });
      await this.prisma.project_department_foremen.deleteMany({
        where: { department_id: id },
      });

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
