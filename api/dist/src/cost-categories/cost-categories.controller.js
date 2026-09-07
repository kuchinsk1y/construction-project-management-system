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
exports.CostCategoriesController = exports.CreateCostCategoryDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateCostCategoryDto {
    name;
    isSalary;
}
exports.CreateCostCategoryDto = CreateCostCategoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCostCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCostCategoryDto.prototype, "isSalary", void 0);
let CostCategoriesController = class CostCategoriesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const categories = await this.prisma.cost_categories.findMany({
            orderBy: { name: 'asc' },
        });
        return categories.map((c) => ({
            id: c.id.toString(),
            name: c.name,
            isSalary: c.is_salary,
        }));
    }
    async create(dto) {
        const existing = await this.prisma.cost_categories.findFirst({
            where: { name: { equals: dto.name, mode: 'insensitive' } }
        });
        if (existing) {
            return {
                id: existing.id.toString(),
                name: existing.name,
                isSalary: existing.is_salary,
            };
        }
        const newCategory = await this.prisma.cost_categories.create({
            data: {
                name: dto.name,
                is_salary: dto.isSalary ?? false,
            },
        });
        return {
            id: newCategory.id.toString(),
            name: newCategory.name,
            isSalary: newCategory.is_salary,
        };
    }
};
exports.CostCategoriesController = CostCategoriesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CostCategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCostCategoryDto]),
    __metadata("design:returntype", Promise)
], CostCategoriesController.prototype, "create", null);
exports.CostCategoriesController = CostCategoriesController = __decorate([
    (0, common_1.Controller)('cost-categories'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CostCategoriesController);
//# sourceMappingURL=cost-categories.controller.js.map