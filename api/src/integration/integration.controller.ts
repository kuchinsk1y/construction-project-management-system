import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller('v1/integration/projects')
@UseGuards(ApiKeyGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  async listProjects(
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('fields') fields?: string,
  ) {
    return this.integrationService.listActiveProjects({
      status,
      managerId,
      fields,
    });
  }

  @Get(':id')
  async getProject(@Param('id') id: string, @Query('fields') fields?: string) {
    return this.integrationService.getProjectDetails(id, fields);
  }
}
