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
exports.PlannedExpensesController = void 0;
const common_1 = require("@nestjs/common");
const planned_expenses_service_1 = require("./planned-expenses.service");
const planned_expense_dto_1 = require("./dto/planned-expense.dto");
let PlannedExpensesController = class PlannedExpensesController {
    plannedExpensesService;
    constructor(plannedExpensesService) {
        this.plannedExpensesService = plannedExpensesService;
    }
    async findAll(projectId) {
        return this.plannedExpensesService.findAll(projectId);
    }
    async create(projectId, dto) {
        return this.plannedExpensesService.create(projectId, dto);
    }
    async update(projectId, id, dto) {
        return this.plannedExpensesService.update(projectId, id, dto);
    }
    async remove(projectId, id) {
        return this.plannedExpensesService.remove(projectId, id);
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
    __metadata("design:paramtypes", [String, planned_expense_dto_1.CreatePlannedExpenseDto]),
    __metadata("design:returntype", Promise)
], PlannedExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, planned_expense_dto_1.UpdatePlannedExpenseDto]),
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
    __metadata("design:paramtypes", [planned_expenses_service_1.PlannedExpensesService])
], PlannedExpensesController);
//# sourceMappingURL=planned-expenses.controller.js.map