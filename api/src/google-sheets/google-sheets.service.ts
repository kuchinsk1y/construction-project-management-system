import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { HeaderMapping, SheetConfig } from './interfaces';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly auth: Auth.GoogleAuth;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    const keyFile = this.config.get<string>(
      'GOOGLE_CREDENTIALS_FILE',
      'google-credentials.json',
    );

    this.auth = new google.auth.GoogleAuth({
      keyFile: join(process.cwd(), keyFile),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }

  async queryData<T = Record<string, unknown>>(
    config: SheetConfig,
    queryBuilder: (cols: HeaderMapping) => string,
  ): Promise<T[]> {
    try {
      const headers = await this.getColumnsMapping(config);
      const query = queryBuilder(headers);
      const token = await this.getAuthToken();
      const headersRowIndex = config.headersRowIndex ?? 1;

      const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`;
      const { data } = await firstValueFrom(
        this.httpService.get<string>(url, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            sheet: config.sheetName,
            tq: query,
            headers: headersRowIndex,
          },
        }),
      );

      return this.parseGvizResponse<T>(data);
    } catch (error) {
      this.logger.error('Google Sheets query failed', error as Error);
      throw new InternalServerErrorException(
        'Failed to load data from Google Sheets',
      );
    }
  }

  private async getColumnsMapping(config: SheetConfig): Promise<HeaderMapping> {
    const token = await this.getAuthToken();
    const headersRowIndex = config.headersRowIndex ?? 1;

    const url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`;
    const { data } = await firstValueFrom(
      this.httpService.get<string>(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          sheet: config.sheetName,
          tq: 'select * limit 1',
          headers: headersRowIndex,
        },
      }),
    );

    const parsed = this.parseGvizResponse<Record<string, unknown>>(data);
    const first = parsed[0] ?? {};
    const keys = Object.keys(first);

    const mapping: HeaderMapping = {};
    for (let i = 0; i < keys.length; i += 1) {
      mapping[keys[i]] = this.numberToColumn(i + 1);
    }

    return mapping;
  }

  private async getAuthToken(): Promise<string> {
    const client = await this.auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new InternalServerErrorException('Google auth token is empty');
    }

    return token.token;
  }

  private parseGvizResponse<T>(payload: string): T[] {
    const start = payload.indexOf('{');
    const end = payload.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return [];
    }

    const json = JSON.parse(payload.slice(start, end + 1)) as {
      table?: {
        cols?: Array<{ label?: string }>;
        rows?: Array<{ c?: Array<{ v?: unknown }> }>;
      };
    };

    const cols = json.table?.cols ?? [];
    const rows = json.table?.rows ?? [];

    return rows.map((row) => {
      const item: Record<string, unknown> = {};
      const cells = row.c ?? [];

      for (let i = 0; i < cols.length; i += 1) {
        const key = cols[i]?.label || this.numberToColumn(i + 1);
        item[key] = cells[i]?.v ?? null;
      }

      return item as T;
    });
  }

  private numberToColumn(index: number): string {
    let n = index;
    let label = '';

    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }

    return label;
  }

  private getSheetsClient() {
    return google.sheets({ version: 'v4', auth: this.auth });
  }

  async getHeaders(
    spreadsheetId: string,
    sheetName: string,
  ): Promise<string[]> {
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
    } catch (error) {
      this.logger.error(
        `Failed to get headers for sheet ${sheetName}`,
        error as Error,
      );
      throw error;
    }
  }

  async findRowIndexById(
    spreadsheetId: string,
    sheetName: string,
    id: string,
  ): Promise<number | null> {
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
      if (!values) return null;
      for (let i = 1; i < values.length; i++) {
        if (values[i] && String(values[i][0]).trim() === String(id).trim()) {
          return i + 1; // 1-based row index in Sheets
        }
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to find row index by ID ${id} in sheet ${sheetName}`,
        error as Error,
      );
      return null;
    }
  }

  async updateRow(
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const headers = await this.getHeaders(spreadsheetId, sheetName);
    const lowercaseData: Record<string, unknown> = {};
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
      this.logger.log(
        `Successfully updated row ${rowNumber} in sheet ${sheetName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update row ${rowNumber} in sheet ${sheetName}`,
        error as Error,
      );
      throw error;
    }
  }

  async appendRow(
    spreadsheetId: string,
    sheetName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const headers = await this.getHeaders(spreadsheetId, sheetName);
    const lowercaseData: Record<string, unknown> = {};
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
    } catch (error) {
      this.logger.error(
        `Failed to append row to sheet ${sheetName}`,
        error as Error,
      );
      throw error;
    }
  }

  private stringifyValue(val: unknown): string {
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
}
