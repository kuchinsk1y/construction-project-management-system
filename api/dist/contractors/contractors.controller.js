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
exports.ContractorsController = void 0;
const common_1 = require("@nestjs/common");
const create_contractor_dto_1 = require("./dto/create-contractor.dto");
const update_contractor_dto_1 = require("./dto/update-contractor.dto");
const contractors_service_1 = require("./contractors.service");
let ContractorsController = class ContractorsController {
    contractorsService;
    constructor(contractorsService) {
        this.contractorsService = contractorsService;
    }
    list() {
        return this.contractorsService.list();
    }
    create(dto) {
        return this.contractorsService.create(dto);
    }
    update(id, dto) {
        return this.contractorsService.update(id, dto);
    }
    delete(id) {
        return this.contractorsService.delete(id);
    }
};
exports.ContractorsController = ContractorsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContractorsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contractor_dto_1.CreateContractorDto]),
    __metadata("design:returntype", void 0)
], ContractorsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_contractor_dto_1.UpdateContractorDto]),
    __metadata("design:returntype", void 0)
], ContractorsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContractorsController.prototype, "delete", null);
exports.ContractorsController = ContractorsController = __decorate([
    (0, common_1.Controller)('contractors'),
    __metadata("design:paramtypes", [contractors_service_1.ContractorsService])
], ContractorsController);
//# sourceMappingURL=contractors.controller.js.map