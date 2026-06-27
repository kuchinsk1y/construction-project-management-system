import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list() {
    return this.projectsService.list();
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Get('reference/contractors')
  listContractors() {
    return this.projectsService.listContractors();
  }

  @Get('reference/project-types')
  listProjectTypes() {
    return this.projectsService.listProjectTypes();
  }

  @Get('reference/departments')
  listDepartments() {
    return this.projectsService.listDepartments();
  }

  @Get('reference/foremen')
  listForemen() {
    return this.projectsService.listForemen();
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  // --- Milestones ---

  @Get(':projectId/milestones')
  listMilestones(@Param('projectId') projectId: string) {
    return this.projectsService.listMilestones(projectId);
  }

  @Post(':projectId/milestones')
  createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(projectId, dto);
  }

  @Put('milestones/:id')
  updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.projectsService.updateMilestone(id, dto);
  }

  @Delete('milestones/:id')
  deleteMilestone(@Param('id') id: string) {
    return this.projectsService.deleteMilestone(id);
  }

  // --- Work Types ---

  @Get(':projectId/work-types')
  listWorkTypes(@Param('projectId') projectId: string) {
    return this.projectsService.listWorkTypes(projectId);
  }

  @Post(':projectId/work-types')
  createWorkType(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkTypeDto,
  ) {
    return this.projectsService.createWorkType(projectId, dto);
  }

  @Put('work-types/:id')
  updateWorkType(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkTypeDto>,
  ) {
    return this.projectsService.updateWorkType(id, dto);
  }

  @Delete('work-types/:id')
  deleteWorkType(@Param('id') id: string) {
    return this.projectsService.deleteWorkType(id);
  }

  // --- Foremen Assignments ---

  @Get(':projectId/foremen')
  listForemenAssignments(@Param('projectId') projectId: string) {
    return this.projectsService.listForemenAssignments(projectId);
  }

  @Post(':projectId/foremen')
  assignForeman(
    @Param('projectId') projectId: string,
    @Body() body: { departmentId: number; foremanId: number },
  ) {
    return this.projectsService.assignForeman(
      projectId,
      body.departmentId,
      body.foremanId,
    );
  }

  // --- Resource Plans ---

  @Get('work-types/:workTypeId/resource-plans')
  listResourcePlans(@Param('workTypeId') workTypeId: string) {
    return this.projectsService.listResourcePlans(workTypeId);
  }

  @Post('work-types/:workTypeId/resource-plans')
  createResourcePlan(
    @Param('workTypeId') workTypeId: string,
    @Body() dto: CreateResourcePlanDto,
  ) {
    return this.projectsService.createResourcePlan(workTypeId, dto);
  }

  @Delete('resource-plans/:id')
  deleteResourcePlan(@Param('id') id: string) {
    return this.projectsService.deleteResourcePlan(id);
  }
}
