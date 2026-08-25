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
exports.PlannedExpensesController = exports.UpdatePlannedExpenseDto = exports.CreatePlannedExpenseDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreatePlannedExpenseDto {
    costCategoryId;
    plannedPercent;
}
exports.CreatePlannedExpenseDto = CreatePlannedExpenseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePlannedExpenseDto.prototype, "costCategoryId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreatePlannedExpenseDto.prototype, "plannedPercent", void 0);
class UpdatePlannedExpenseDto {
    costCategoryId;
    plannedPercent;
}
exports.UpdatePlannedExpenseDto = UpdatePlannedExpenseDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdatePlannedExpenseDto.prototype, "costCategoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdatePlannedExpenseDto.prototype, "plannedPercent", void 0);
let PlannedExpensesController = class PlannedExpensesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(projectId) {
        const expenses = await this.prisma.planned_expenses.findMany({
            where: { project_id: projectId },
            include: {
                cost_categories: true,
            },
            orderBy: { id: 'asc' },
        });
        return expenses.map((e) => ({
            id: e.id,
            projectId: e.project_id,
            costCategoryId: e.cost_category_id.toString(),
            costCategoryName: e.cost_categories?.name,
            plannedPercent: e.planned_percent ? Number(e.planned_percent) : 0,
        }));
    }
    async create(projectId, dto) {
        const project = await this.prisma.projects.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const expense = await this.prisma.planned_expenses.create({
            data: {
                project_id: projectId,
                cost_category_id: BigInt(dto.costCategoryId),
                planned_percent: dto.plannedPercent,
            },
            include: {
                cost_categories: true,
            }
        });
        return {
            id: expense.id,
            projectId: expense.project_id,
            costCategoryId: expense.cost_category_id.toString(),
            costCategoryName: expense.cost_categories?.name,
            plannedPercent: expense.planned_percent ? Number(expense.planned_percent) : 0,
        };
    }
    async update(projectId, id, dto) {
        const data = {};
        if (dto.costCategoryId)
            data.cost_category_id = BigInt(dto.costCategoryId);
        if (dto.plannedPercent !== undefined)
            data.planned_percent = dto.plannedPercent;
        const expense = await this.prisma.planned_expenses.update({
            where: { id },
            data,
            include: {
                cost_categories: true,
            }
        });
        return {
            id: expense.id,
            projectId: expense.project_id,
            costCategoryId: expense.cost_category_id.toString(),
            costCategoryName: expense.cost_categories?.name,
            plannedPercent: expense.planned_percent ? Number(expense.planned_percent) : 0,
        };
    }
    async remove(projectId, id) {
        await this.prisma.planned_expenses.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.PlannedExpensesController = PlannedExpensesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlannedExpensesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreatePlannedExpenseDto]),
    __metadata("design:returntype", Promise)
], PlannedExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdatePlannedExpenseDto]),
    __metadata("design:returntype", Promise)
], PlannedExpensesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlannedExpensesController.prototype, "remove", null);
exports.PlannedExpensesController = PlannedExpensesController = __decorate([
    (0, common_1.Controller)('projects/:projectId/planned-expenses'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlannedExpensesController);
//# sourceMappingURL=planned-expenses.controller.js.map