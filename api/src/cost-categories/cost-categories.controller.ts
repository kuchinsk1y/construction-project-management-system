import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCostCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isSalary?: boolean;
}

@Controller('cost-categories')
export class CostCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    const categories = await this.prisma.cost_categories.findMany({
      orderBy: { name: 'asc' },
    });
    // Serialize BigInt id to string
    return categories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      isSalary: c.is_salary,
    }));
  }

  @Post()
  async create(@Body() dto: CreateCostCategoryDto) {
    // Check if exists
    const existing = await this.prisma.cost_categories.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } }
    });
    if (existing) {
      return {
        id: existing.id.toString(),
        name: existing.name,
        isSalary: existing.is_salary,
      };
    }

    const newCategory = await this.prisma.cost_categories.create({
      data: {
        name: dto.name,
        is_salary: dto.isSalary ?? false,
      },
    });

    return {
      id: newCategory.id.toString(),
      name: newCategory.name,
      isSalary: newCategory.is_salary,
    };
  }
}
