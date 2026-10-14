import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
import { CreateMilestoneInvoiceDto } from './dto/create-milestone-invoice.dto';
import { JwtService } from '@nestjs/jwt';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly jwt: JwtService,
  ) {}

  /** Id of the logged-in user from the Bearer token, or null if missing/invalid. */
  private async requesterId(authorization?: string): Promise<number | null> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }

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

  // --- Milestone Invoices ---

  @Post('milestones/:milestoneId/invoices')
  async createMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: CreateMilestoneInvoiceDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.projectsService.createMilestoneInvoice(
      milestoneId,
      dto,
      await this.requesterId(authorization),
    );
  }

  @Put('milestones/:milestoneId/invoices/:invoiceId')
  updateMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateMilestoneInvoiceDto,
  ) {
    return this.projectsService.updateMilestoneInvoice(milestoneId, invoiceId, dto);
  }

  @Delete('milestones/:milestoneId/invoices/:invoiceId')
  deleteMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.projectsService.deleteMilestoneInvoice(milestoneId, invoiceId);
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

  @Get('work-types/:id/daily-reports')
  listWorkTypeDailyReports(@Param('id') id: string) {
    return this.projectsService.listWorkTypeDailyReports(id);
  }

  // --- Project Departments ---

  @Get(':projectId/departments')
  listProjectDepartments(@Param('projectId') projectId: string) {
    return this.projectsService.listProjectDepartments(projectId);
  }

  @Post(':projectId/departments')
  addProjectDepartment(
    @Param('projectId') projectId: string,
    @Body() body: { departmentId: number },
  ) {
    return this.projectsService.addProjectDepartment(projectId, body.departmentId);
  }

  @Delete(':projectId/departments/:departmentId')
  removeProjectDepartment(
    @Param('projectId') projectId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.projectsService.removeProjectDepartment(projectId, Number(departmentId));
  }

  // --- Foremen Assignments ---

  @Get(':projectId/foremen')
  listForemenAssignments(@Param('projectId') projectId: string) {
    return this.projectsService.listForemenAssignments(projectId);
  }

  @Put(':projectId/foremen')
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

  // --- Hours Plan ---

  @Get(':projectId/hours-plan')
  getHoursPlan(@Param('projectId') projectId: string) {
    return this.projectsService.getHoursPlan(projectId);
  }

  @Put(':projectId/hours-plan')
  updateHoursPlan(
    @Param('projectId') projectId: string,
    @Body() body: { averageHourlyRate: number; distributions: { workTypeId: string; percentage: number }[] },
  ) {
    return this.projectsService.updateHoursPlan(projectId, body);
  }

  // --- Fakturownia ---
  @Get('fakturownia/invoices')
  searchFakturowniaInvoices(@Query('query') query: string, @Query('country') country?: string) {
    return this.projectsService.searchFakturowniaInvoices(query || '', country);
  }
}
