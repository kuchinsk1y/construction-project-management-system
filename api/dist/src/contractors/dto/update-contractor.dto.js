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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContractorDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateContractorDto {
    name;
    tax_number;
}
exports.UpdateContractorDto = UpdateContractorDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Nazwa firmy musi mieć co najmniej 2 znaki' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Nazwa firmy może mieć maksymalnie 255 znaków' }),
    __metadata("design:type", String)
], UpdateContractorDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, {
        message: 'NIP / Numer podatkowy może mieć maksymalnie 100 znaków',
    }),
    __metadata("design:type", String)
], UpdateContractorDto.prototype, "tax_number", void 0);
//# sourceMappingURL=update-contractor.dto.js.map