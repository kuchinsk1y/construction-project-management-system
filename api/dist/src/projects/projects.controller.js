"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const create_milestone_dto_1 = require("./dto/create-milestone.dto");
const update_milestone_dto_1 = require("./dto/update-milestone.dto");
const create_work_type_dto_1 = require("./dto/create-work-type.dto");
const create_resource_plan_dto_1 = require("./dto/create-resource-plan.dto");
const projects_service_1 = require("./projects.service");
let ProjectsController = class ProjectsController {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    list() {
        return this.projectsService.list();
    }
    create(dto) {
        return this.projectsService.create(dto);
    }
    update(id, dto) {
        return this.projectsService.update(id, dto);
    }
    listContractors() {
        return this.projectsService.listContractors();
    }
    listProjectTypes() {
        return this.projectsService.listProjectTypes();
    }
    listDepartments() {
        return this.projectsService.listDepartments();
    }
    listForemen() {
        return this.projectsService.listForemen();
    }
    delete(id) {
        return this.projectsService.delete(id);
    }
    listMilestones(projectId) {
        return this.projectsService.listMilestones(projectId);
    }
    createMilestone(projectId, dto) {
        return this.projectsService.createMilestone(projectId, dto);
    }
    updateMilestone(id, dto) {
        return this.projectsService.updateMilestone(id, dto);
    }
    deleteMilestone(id) {
        return this.projectsService.deleteMilestone(id);
    }
    listWorkTypes(projectId) {
        return this.projectsService.listWorkTypes(projectId);
    }
    createWorkType(projectId, dto) {
        return this.projectsService.createWorkType(projectId, dto);
    }
    updateWorkType(id, dto) {
        return this.projectsService.updateWorkType(id, dto);
    }
    deleteWorkType(id) {
        return this.projectsService.deleteWorkType(id);
    }
    listForemenAssignments(projectId) {
        return this.projectsService.listForemenAssignments(projectId);
    }
    assignForeman(projectId, body) {
        return this.projectsService.assignForeman(projectId, body.departmentId, body.foremanId);
    }
    listResourcePlans(workTypeId) {
        return this.projectsService.listResourcePlans(workTypeId);
    }
    createResourcePlan(workTypeId, dto) {
        return this.projectsService.createResourcePlan(workTypeId, dto);
    }
    deleteResourcePlan(id) {
        return this.projectsService.deleteResourcePlan(id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('reference/contractors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listContractors", null);
__decorate([
    (0, common_1.Get)('reference/project-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listProjectTypes", null);
__decorate([
    (0, common_1.Get)('reference/departments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listDepartments", null);
__decorate([
    (0, common_1.Get)('reference/foremen'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listForemen", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':projectId/milestones'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listMilestones", null);
__decorate([
    (0, common_1.Post)(':projectId/milestones'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_milestone_dto_1.CreateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "createMilestone", null);
__decorate([
    (0, common_1.Put)('milestones/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_milestone_dto_1.UpdateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateMilestone", null);
__decorate([
    (0, common_1.Delete)('milestones/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "deleteMilestone", null);
__decorate([
    (0, common_1.Get)(':projectId/work-types'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listWorkTypes", null);
__decorate([
    (0, common_1.Post)(':projectId/work-types'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_work_type_dto_1.CreateWorkTypeDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "createWorkType", null);
__decorate([
    (0, common_1.Put)('work-types/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateWorkType", null);
__decorate([
    (0, common_1.Delete)('work-types/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "deleteWorkType", null);
__decorate([
    (0, common_1.Get)(':projectId/foremen'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listForemenAssignments", null);
__decorate([
    (0, common_1.Post)(':projectId/foremen'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "assignForeman", null);
__decorate([
    (0, common_1.Get)('work-types/:workTypeId/resource-plans'),
    __param(0, (0, common_1.Param)('workTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "listResourcePlans", null);
__decorate([
    (0, common_1.Post)('work-types/:workTypeId/resource-plans'),
    __param(0, (0, common_1.Param)('workTypeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_resource_plan_dto_1.CreateResourcePlanDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "createResourcePlan", null);
__decorate([
    (0, common_1.Delete)('resource-plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "deleteResourcePlan", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map