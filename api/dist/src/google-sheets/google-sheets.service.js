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
var GoogleSheetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSheetsService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
let GoogleSheetsService = GoogleSheetsService_1 = class GoogleSheetsService {
    httpService;
    config;
    logger = new common_1.Logger(GoogleSheetsService_1.name);
    auth;
    constructor(httpService, config) {
        this.httpService = httpService;
        this.config = config;
        const keyFile = this.config.get('GOOGLE_CREDENTIALS_FILE', 'google-credentials.json');
        this.auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: (0, path_1.join)(process.cwd(), keyFile),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.readonly',
            ],
        });
    }
    async queryData(config, queryBuilder) {
        try {
            const headers = await this.getColumnsMapping(config);
            const query = queryBuilder(headers);
            const token = await this.getAuthToken();
            const headersRowIndex = config.headersRowIndex ?? 1;
            const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`;
            const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    sheet: config.sheetName,
                    tq: query,
                    headers: headersRowIndex,
                },
            }));
            return this.parseGvizResponse(data);
        }
        catch (error) {
            this.logger.error('Google Sheets query failed', error);
            throw new common_1.InternalServerErrorException('Failed to load data from Google Sheets');
        }
    }
    async getColumnsMapping(config) {
        const token = await this.getAuthToken();
        const headersRowIndex = config.headersRowIndex ?? 1;
        const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`;
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                sheet: config.sheetName,
                tq: 'select * limit 1',
                headers: headersRowIndex,
            },
        }));
        const parsed = this.parseGvizResponse(data);
        const first = parsed[0] ?? {};
        const keys = Object.keys(first);
        const mapping = {};
        for (let i = 0; i < keys.length; i += 1) {
            mapping[keys[i]] = this.numberToColumn(i + 1);
        }
        return mapping;
    }
    async getAuthToken() {
        const client = await this.auth.getClient();
        const token = await client.getAccessToken();
        if (!token.token) {
            throw new common_1.InternalServerErrorException('Google auth token is empty');
        }
        return token.token;
    }
    parseGvizResponse(payload) {
        const start = payload.indexOf('{');
        const end = payload.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            return [];
        }
        const json = JSON.parse(payload.slice(start, end + 1));
        const cols = json.table?.cols ?? [];
        const rows = json.table?.rows ?? [];
        return rows.map((row) => {
            const item = {};
            const cells = row.c ?? [];
            for (let i = 0; i < cols.length; i += 1) {
                const key = cols[i]?.label || this.numberToColumn(i + 1);
                item[key] = cells[i]?.v ?? null;
            }
            return item;
        });
    }
    numberToColumn(index) {
        let n = index;
        let label = '';
        while (n > 0) {
            const rem = (n - 1) % 26;
            label = String.fromCharCode(65 + rem) + label;
            n = Math.floor((n - 1) / 26);
        }
        return label;
    }
    getSheetsClient() {
        return googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
    }
    async getHeaders(spreadsheetId, sheetName) {
        const sheets = this.getSheetsClient();
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return [];
            }
            return rows[0].map((h) => String(h).trim().toLowerCase());
        }
        catch (error) {
            this.logger.error(`Failed to get headers for sheet ${sheetName}`, error);
            throw error;
        }
    }
    async findRowIndexById(spreadsheetId, sheetName, id) {
        const headers = await this.getHeaders(spreadsheetId, sheetName);
        const idColIndex = headers.indexOf('id');
        if (idColIndex === -1) {
            this.logger.warn(`Column "id" not found in sheet ${sheetName}`);
            return null;
        }
        const colLetter = this.numberToColumn(idColIndex + 1);
        const sheets = this.getSheetsClient();
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!${colLetter}:${colLetter}`,
            });
            const values = response.data.values;
            if (!values)
                return null;
            for (let i = 1; i < values.length; i++) {
                if (values[i] && String(values[i][0]).trim() === String(id).trim()) {
                    return i + 1;
                }
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to find row index by ID ${id} in sheet ${sheetName}`, error);
            return null;
        }
    }
    async updateRow(spreadsheetId, sheetName, rowNumber, data) {
        const headers = await this.getHeaders(spreadsheetId, sheetName);
        const lowercaseData = {};
        for (const key of Object.keys(data)) {
            lowercaseData[key.toLowerCase()] = data[key];
        }
        const values = headers.map((header) => {
            const val = lowercaseData[header];
            return this.stringifyValue(val);
        });
        const maxColLetter = this.numberToColumn(headers.length);
        const sheets = this.getSheetsClient();
        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowNumber}:${maxColLetter}${rowNumber}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                },
            });
            this.logger.log(`Successfully updated row ${rowNumber} in sheet ${sheetName}`);
        }
        catch (error) {
            this.logger.error(`Failed to update row ${rowNumber} in sheet ${sheetName}`, error);
            throw error;
        }
    }
    async appendRow(spreadsheetId, sheetName, data) {
        const headers = await this.getHeaders(spreadsheetId, sheetName);
        const lowercaseData = {};
        for (const key of Object.keys(data)) {
            lowercaseData[key.toLowerCase()] = data[key];
        }
        const values = headers.map((header) => {
            const val = lowercaseData[header];
            return this.stringifyValue(val);
        });
        const sheets = this.getSheetsClient();
        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                },
            });
            this.logger.log(`Successfully appended row to sheet ${sheetName}`);
        }
        catch (error) {
            this.logger.error(`Failed to append row to sheet ${sheetName}`, error);
            throw error;
        }
    }
    stringifyValue(val) {
        if (val === null || val === undefined) {
            return '';
        }
        if (typeof val === 'object') {
            if (val instanceof Date) {
                return val.toISOString();
            }
            return JSON.stringify(val);
        }
        return String(val);
    }
};
exports.GoogleSheetsService = GoogleSheetsService;
exports.GoogleSheetsService = GoogleSheetsService = GoogleSheetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], GoogleSheetsService);
//# sourceMappingURL=google-sheets.service.js.map