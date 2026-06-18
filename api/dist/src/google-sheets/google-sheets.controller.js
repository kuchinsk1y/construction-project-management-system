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
exports.GoogleSheetsController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_sheets_service_1 = require("./google-sheets.service");
let GoogleSheetsController = class GoogleSheetsController {
    sheetsService;
    config;
    constructor(sheetsService, config) {
        this.sheetsService = sheetsService;
        this.config = config;
    }
    async getZakresProjects() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const config = {
            spreadsheetId: this.config.getOrThrow('PROJECTS_SPREADSHEET_ID'),
            sheetName: this.config.getOrThrow('PROJECTS_SHEET_NAME'),
        };
        const H_PROJECT = 'project';
        const H_PROJECT_TYPE = 'projectType';
        const H_STATUS = 'status';
        const H_DATE_FROM_FACT = 'dateFromFact';
        const H_DATE_TO_FACT = 'dateToFact';
        const rows = await this.sheetsService.queryData(config, (cols) => {
            const cProject = cols[H_PROJECT];
            const cProjectType = cols[H_PROJECT_TYPE];
            const cStatus = cols[H_STATUS];
            const cDateFromFact = cols[H_DATE_FROM_FACT];
            const cDateToFact = cols[H_DATE_TO_FACT];
            return (`select ${cProject}, ${cProjectType}, ${cStatus}, ${cDateFromFact}, ${cDateToFact} ` +
                `where lower(${cStatus}) = 'active' ` +
                `or (lower(${cStatus}) = 'completed' and ${cDateToFact} >= date '${cutoffStr}') ` +
                `order by ${cProject} asc`);
        });
        return rows.map((row) => ({
            project: this.toStringOrNull(row[H_PROJECT]),
            projectType: this.toStringOrNull(row[H_PROJECT_TYPE]),
            status: this.toStringOrNull(row[H_STATUS]),
            dateFromFact: this.toDateOrNull(row[H_DATE_FROM_FACT]),
            dateToFact: this.toDateOrNull(row[H_DATE_TO_FACT]),
        }));
    }
    async getProjects() {
        const config = {
            spreadsheetId: this.config.getOrThrow('PROJECTS_SPREADSHEET_ID'),
            sheetName: this.config.getOrThrow('PROJECTS_SHEET_NAME'),
        };
        const H_ID = 'id';
        const H_CONTRACTOR = 'contractor';
        const H_PROJECT = 'project';
        const H_LOCATION = 'location';
        const H_DATE_FROM = 'dateFrom';
        const H_DATE_TO = 'dateTo';
        const H_PROJECT_TYPE = 'projectType';
        const H_PIN = 'pin';
        const H_MANAGER = 'manager';
        const H_POWER = 'power';
        const H_DOKUMENTATION_URL = 'dokumentationUrl';
        const H_COUNTRY = 'country';
        const H_STATUS = 'status';
        const H_DATE_FROM_FACT = 'dateFromFact';
        const H_DATE_TO_FACT = 'dateToFact';
        const rows = await this.sheetsService.queryData(config, (cols) => {
            const cId = cols[H_ID];
            const cContractor = cols[H_CONTRACTOR];
            const cProject = cols[H_PROJECT];
            const cLocation = cols[H_LOCATION];
            const cDateFrom = cols[H_DATE_FROM];
            const cDateTo = cols[H_DATE_TO];
            const cProjectType = cols[H_PROJECT_TYPE];
            const cPin = cols[H_PIN];
            const cManager = cols[H_MANAGER];
            const cPower = cols[H_POWER];
            const cDokumentationUrl = cols[H_DOKUMENTATION_URL];
            const cCountry = cols[H_COUNTRY];
            const cStatus = cols[H_STATUS];
            const cDateFromFact = cols[H_DATE_FROM_FACT];
            const cDateToFact = cols[H_DATE_TO_FACT];
            return (`select ${cId}, ${cContractor}, ${cProject}, ${cLocation}, ${cDateFrom}, ${cDateTo}, ` +
                `${cProjectType}, ${cPin}, ${cManager}, ${cPower}, ${cDokumentationUrl}, ${cCountry}, ` +
                `${cStatus}, ${cDateFromFact}, ${cDateToFact} ` +
                `order by ${cProject} asc`);
        });
        return rows.map((row) => ({
            id: this.toStringOrNull(row[H_ID]),
            contractor: this.toStringOrNull(row[H_CONTRACTOR]),
            project: this.toStringOrNull(row[H_PROJECT]),
            location: this.toStringOrNull(row[H_LOCATION]),
            dateFrom: this.toStringOrNull(row[H_DATE_FROM]),
            dateTo: this.toStringOrNull(row[H_DATE_TO]),
            projectType: this.toStringOrNull(row[H_PROJECT_TYPE]),
            pin: this.toStringOrNull(row[H_PIN]),
            manager: this.toStringOrNull(row[H_MANAGER]),
            power: this.toStringOrNull(row[H_POWER]),
            dokumentationUrl: this.toStringOrNull(row[H_DOKUMENTATION_URL]),
            country: this.toStringOrNull(row[H_COUNTRY]),
            status: this.toStringOrNull(row[H_STATUS]),
            dateFromFact: this.toStringOrNull(row[H_DATE_FROM_FACT]),
            dateToFact: this.toStringOrNull(row[H_DATE_TO_FACT]),
        }));
    }
    toStringOrNull(value) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length ? trimmed : null;
        }
        if (typeof value === 'number') {
            return String(value);
        }
        return null;
    }
    toDateOrNull(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }
        if (typeof value === 'string' && value.trim().length) {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    }
};
exports.GoogleSheetsController = GoogleSheetsController;
__decorate([
    (0, common_1.Get)('zakres-projects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoogleSheetsController.prototype, "getZakresProjects", null);
__decorate([
    (0, common_1.Get)('projects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoogleSheetsController.prototype, "getProjects", null);
exports.GoogleSheetsController = GoogleSheetsController = __decorate([
    (0, common_1.Controller)('sheets'),
    __metadata("design:paramtypes", [google_sheets_service_1.GoogleSheetsService,
        config_1.ConfigService])
], GoogleSheetsController);
//# sourceMappingURL=google-sheets.controller.js.map