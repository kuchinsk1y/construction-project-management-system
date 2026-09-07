import { ConfigService } from '@nestjs/config';
import { GoogleSheetsService } from './google-sheets.service';
import { SheetsProjectRow, ZakresProjectEntry } from './interfaces';
export declare class GoogleSheetsController {
    private readonly sheetsService;
    private readonly config;
    constructor(sheetsService: GoogleSheetsService, config: ConfigService);
    getZakresProjects(): Promise<ZakresProjectEntry[]>;
    getProjects(): Promise<SheetsProjectRow[]>;
    private toStringOrNull;
    private toDateOrNull;
}
