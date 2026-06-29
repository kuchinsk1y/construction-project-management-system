import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';

@Injectable()
export class ContractorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.contractors.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateContractorDto) {
    const name = dto.name.trim();
    const tax_number = dto.tax_number?.trim() || null;

    // Check if contractor with this name already exists (case-insensitive)
    const exists = await this.prisma.contractors.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (exists) {
      throw new BadRequestException('Kontrahent o takiej nazwie już istnieje');
    }

    return this.prisma.contractors.create({
      data: {
        name,
        tax_number,
        street: dto.street?.trim() || null,
        postal_code: dto.postal_code?.trim() || null,
        city: dto.city?.trim() || null,
        country: dto.country?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateContractorDto) {
    const existing = await this.prisma.contractors.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Kontrahent nie został znaleziony');
    }

    const data: {
      name?: string;
      tax_number?: string | null;
      street?: string | null;
      postal_code?: string | null;
      city?: string | null;
      country?: string | null;
      notes?: string | null;
    } = {};

    if (typeof dto.name === 'string') {
      const name = dto.name.trim();
      const exists = await this.prisma.contractors.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (exists) {
        throw new BadRequestException(
          'Kontrahent o takiej nazwie już istnieje',
        );
      }
      data.name = name;
    }

    if (dto.tax_number !== undefined) {
      data.tax_number = dto.tax_number?.trim() || null;
    }

    if (dto.street !== undefined) {
      data.street = dto.street?.trim() || null;
    }

    if (dto.postal_code !== undefined) {
      data.postal_code = dto.postal_code?.trim() || null;
    }

    if (dto.city !== undefined) {
      data.city = dto.city?.trim() || null;
    }

    if (dto.country !== undefined) {
      data.country = dto.country?.trim() || null;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    return this.prisma.contractors.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.contractors.findUnique({
      where: { id },
      include: {
        projects: { select: { id: true } },
        users: { select: { id: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Kontrahent nie został znaleziony');
    }

    if (existing.projects.length > 0) {
      throw new BadRequestException(
        'Nie można usunąć kontrahenta, ponieważ posiada on przypisane projekty',
      );
    }

    if (existing.users.length > 0) {
      throw new BadRequestException(
        'Nie można usunąć kontrahenta, ponieważ posiada on przypisanych użytkowników',
      );
    }

    return this.prisma.contractors.delete({
      where: { id },
    });
  }
}
