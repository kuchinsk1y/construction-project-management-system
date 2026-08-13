import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Post()
  create(
    @Body()
    createDepartmentDto: {
      name: string;
      description?: string;
      icon?: string;
      is_active?: boolean;
    },
  ) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateDepartmentDto: {
      name?: string;
      description?: string;
      icon?: string;
      is_active?: boolean;
    },
  ) {
    return this.departmentsService.update(BigInt(id), updateDepartmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(BigInt(id));
  }
}
