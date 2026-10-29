import { Roles, Role, ContractorAccess, CurrentUser, type AuthUser } from '../auth/access';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto, SaveMilestonesDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
import { CreateMilestoneInvoiceDto } from './dto/create-milestone-invoice.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ContractorAccess('scoped')
  list(@CurrentUser() user: AuthUser) {
    // A contractor gets only the projects of its own company
    return this.projectsService.list(user.isContractorOnly ? (user.contractorId ?? '__none__') : null);
  }

  @Post()
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Put(':id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Get('reference/contractors')
  @ContractorAccess('scoped')
  listContractors(@CurrentUser() user: AuthUser) {
    return this.projectsService.listContractors(user.isContractorOnly ? (user.contractorId ?? '__none__') : null);
  }

  @Get('reference/project-types')
  @ContractorAccess('scoped')
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
  @Roles(Role.Admin)
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  // --- Milestones ---

  @Get(':projectId/milestones')
  @ContractorAccess('param:projectId')
  listMilestones(@Param('projectId') projectId: string) {
    return this.projectsService.listMilestones(projectId);
  }

  @Post(':projectId/milestones')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(projectId, dto);
  }

  /** Saves the whole list of milestones in one request (rows not sent are removed) */
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  @Put(':projectId/milestones')
  saveMilestones(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: SaveMilestonesDto) {
    return this.projectsService.saveMilestones(projectId, dto);
  }

  @Put('milestones/:id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.projectsService.updateMilestone(id, dto);
  }

  @Delete('milestones/:id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  deleteMilestone(@Param('id') id: string) {
    return this.projectsService.deleteMilestone(id);
  }

  // --- Milestone Invoices ---

  @Post('milestones/:milestoneId/invoices')
  @Roles(Role.OperationalDirector, Role.ProjectManager, Role.FinancialDirector)
  async createMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: CreateMilestoneInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.createMilestoneInvoice(milestoneId, dto, user.id);
  }

  @Put('milestones/:milestoneId/invoices/:invoiceId')
  @Roles(Role.FinancialDirector)
  updateMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateMilestoneInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.updateMilestoneInvoice(milestoneId, invoiceId, dto, user.isAdmin);
  }

  @Delete('milestones/:milestoneId/invoices/:invoiceId')
  @Roles(Role.FinancialDirector)
  deleteMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.deleteMilestoneInvoice(milestoneId, invoiceId, user.isAdmin);
  }

  // --- Work Types ---

  @Get(':projectId/work-types')
  @ContractorAccess('param:projectId')
  listWorkTypes(@Param('projectId') projectId: string) {
    return this.projectsService.listWorkTypes(projectId);
  }

  @Post(':projectId/work-types')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  createWorkType(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkTypeDto,
  ) {
    return this.projectsService.createWorkType(projectId, dto);
  }

  @Put('work-types/:id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  updateWorkType(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkTypeDto>,
  ) {
    return this.projectsService.updateWorkType(id, dto);
  }

  @Delete('work-types/:id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  deleteWorkType(@Param('id') id: string) {
    return this.projectsService.deleteWorkType(id);
  }

  @Get('work-types/:id/daily-reports')
  @ContractorAccess('workType:id')
  listWorkTypeDailyReports(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.listWorkTypeDailyReports(id);
  }

  // --- Project Departments ---

  @Get(':projectId/departments')
  @ContractorAccess('param:projectId')
  listProjectDepartments(@Param('projectId') projectId: string) {
    return this.projectsService.listProjectDepartments(projectId);
  }

  @Post(':projectId/departments')
  @Roles(Role.ProjectManager)
  addProjectDepartment(
    @Param('projectId') projectId: string,
    @Body() body: { departmentId: number },
  ) {
    return this.projectsService.addProjectDepartment(projectId, body.departmentId);
  }

  @Delete(':projectId/departments/:departmentId')
  @Roles(Role.ProjectManager)
  removeProjectDepartment(
    @Param('projectId') projectId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.projectsService.removeProjectDepartment(projectId, Number(departmentId));
  }

  // --- Foremen Assignments ---

  @Get(':projectId/foremen')
  @ContractorAccess('param:projectId')
  listForemenAssignments(@Param('projectId') projectId: string) {
    return this.projectsService.listForemenAssignments(projectId);
  }

  @Put(':projectId/foremen')
  @Roles(Role.ProjectManager)
  bulkAssignForemen(
    @Param('projectId') projectId: string,
    @Body() body: { assignments: { departmentId: number; foremanIds: number[] }[] },
  ) {
    return this.projectsService.bulkAssignForemen(
      projectId,
      body.assignments,
    );
  }

  @Put(':projectId/departments/batch-sync')
  @Roles(Role.ProjectManager)
  batchSyncDepartments(
    @Param('projectId') projectId: string,
    @Body() body: { assignments: { departmentId: number; foremanIds: number[]; works?: { id?: string; name: string }[] }[] },
  ) {
    return this.projectsService.batchSyncDepartments(projectId, body.assignments);
  }

  // --- Resource Plans ---

  @Get('work-types/:workTypeId/resource-plans')
  listResourcePlans(@Param('workTypeId') workTypeId: string) {
    return this.projectsService.listResourcePlans(workTypeId);
  }

  @Post('work-types/:workTypeId/resource-plans')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  createResourcePlan(
    @Param('workTypeId') workTypeId: string,
    @Body() dto: CreateResourcePlanDto,
  ) {
    return this.projectsService.createResourcePlan(workTypeId, dto);
  }

  @Delete('resource-plans/:id')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  deleteResourcePlan(@Param('id') id: string) {
    return this.projectsService.deleteResourcePlan(id);
  }

  // --- Hours Plan ---

  @Get(':projectId/hours-plan')
  @ContractorAccess('param:projectId')
  getHoursPlan(@Param('projectId') projectId: string) {
    return this.projectsService.getHoursPlan(projectId);
  }

  @Put(':projectId/hours-plan')
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  updateHoursPlan(
    @Param('projectId') projectId: string,
    @Body() body: { averageHourlyRate: number; distributions: { workTypeId: string; percentage: number }[] },
  ) {
    return this.projectsService.updateHoursPlan(projectId, body);
  }

  // --- Fakturownia ---
  @Get('fakturownia/invoices')
  @Roles(Role.FinancialDirector)
  searchFakturowniaInvoices(@Query('query') query: string, @Query('country') country?: string) {
    return this.projectsService.searchFakturowniaInvoices(query || '', country);
  }
}
