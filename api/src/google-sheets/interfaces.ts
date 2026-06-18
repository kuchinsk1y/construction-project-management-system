export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  headersRowIndex?: number;
}

export type HeaderMapping = Record<string, string>;

export interface ZakresProjectEntry {
  project: string | null;
  projectType: string | null;
  status: string | null;
  dateFromFact: Date | null;
  dateToFact: Date | null;
}

export interface SheetsProjectRow {
  id: string | null;
  contractor: string | null;
  project: string | null;
  location: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  projectType: string | null;
  pin: string | null;
  manager: string | null;
  power: string | null;
  dokumentationUrl: string | null;
  country: string | null;
  status: string | null;
  dateFromFact: string | null;
  dateToFact: string | null;
}
