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
  list() {
    return this.contractorsService.list();
  }

  @Post()
  create(@Body() dto: CreateContractorDto) {
    return this.contractorsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractorDto) {
    return this.contractorsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contractorsService.delete(id);
  }
}
