import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HeaderMapping, SheetConfig } from './interfaces';
export declare class GoogleSheetsService {
    private readonly httpService;
    private readonly config;
    private readonly logger;
    private readonly auth;
    constructor(httpService: HttpService, config: ConfigService);
    queryData<T = Record<string, unknown>>(config: SheetConfig, queryBuilder: (cols: HeaderMapping) => string): Promise<T[]>;
    private getColumnsMapping;
    private getAuthToken;
    private parseGvizResponse;
    private numberToColumn;
    private getSheetsClient;
    getHeaders(spreadsheetId: string, sheetName: string): Promise<string[]>;
    findRowIndexById(spreadsheetId: string, sheetName: string, id: string): Promise<number | null>;
    updateRow(spreadsheetId: string, sheetName: string, rowNumber: number, data: Record<string, unknown>): Promise<void>;
    appendRow(spreadsheetId: string, sheetName: string, data: Record<string, unknown>): Promise<void>;
    private stringifyValue;
}
