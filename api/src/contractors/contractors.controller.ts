import { Roles, Role } from '../auth/access';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { ContractorsService } from './contractors.service';

@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Get()
  @Roles(Role.OperationalDirector, Role.FinancialDirector, Role.ProjectManager)
  list() {
    return this.contractorsService.list();
  }

  @Post()
  @Roles(Role.OperationalDirector)
  create(@Body() dto: CreateContractorDto) {
    return this.contractorsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OperationalDirector)
  update(@Param('id') id: string, @Body() dto: UpdateContractorDto) {
    return this.contractorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OperationalDirector)
  delete(@Param('id') id: string) {
    return this.contractorsService.delete(id);
  }
}
