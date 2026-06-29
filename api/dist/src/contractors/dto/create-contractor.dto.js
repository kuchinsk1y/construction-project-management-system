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
exports.CreateContractorDto = void 0;
const class_validator_1 = require("class-validator");
class CreateContractorDto {
    name;
    tax_number;
    street;
    postal_code;
    city;
    country;
    notes;
}
exports.CreateContractorDto = CreateContractorDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Nazwa firmy musi mieć co najmniej 2 znaki' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Nazwa firmy może mieć maksymalnie 255 znaków' }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, {
        message: 'NIP / Numer podatkowy może mieć maksymalnie 100 znaków',
    }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "tax_number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255, { message: 'Nazwa ulicy może mieć maksymalnie 255 znaków' }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "street", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20, { message: 'Kod pocztowy może mieć maksymalnie 20 znaków' }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "postal_code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Nazwa miejscowości może mieć maksymalnie 100 znaków' }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Nazwa kraju może mieć maksymalnie 100 znaków' }),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateContractorDto.prototype, "notes", void 0);
//# sourceMappingURL=create-contractor.dto.js.map