import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { HeaderMapping, SheetConfig } from './interfaces';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly auth;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    const keyFile = this.config.get<string>('GOOGLE_CREDENTIALS_FILE', 'google-credentials.json');

    this.auth = new google.auth.GoogleAuth({
      keyFile: join(process.cwd(), keyFile),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
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
      throw new InternalServerErrorException('Failed to load data from Google Sheets');
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
}
