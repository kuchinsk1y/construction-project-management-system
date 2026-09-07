import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller('v1/integration/projects')
@UseGuards(ApiKeyGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  async listProjects() {
    return this.integrationService.listActiveProjects();
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.integrationService.getProjectDetails(id);
  }
}
