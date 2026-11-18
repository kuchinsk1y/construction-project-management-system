import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Mock answers of TMA (BRIGADE_TMA_MODE=mock): JSON files in ./mock, exactly in the format TMA returns.
 * They go through the same parsing as real answers.
 *
 * Placeholders, filled in when a file is read (so the mock does not get old and fits any database):
 *   {{today}}, {{today-3}}, {{today+4}}  date in Warsaw time, YYYY-MM-DD
 *   {{now}}                              current time, ISO
 *   {{project:1}}, {{project:2}}…        N-th active ERP project (most work types first); missing → null
 *   {{workType:1:3}}                     3rd work type (by name) of project 1; missing → null
 *   {{mockPhone}}, {{mockTelegramId}}    from BRIGADE_MOCK_PHONE / BRIGADE_MOCK_TELEGRAM_ID
 */
export type MockFile = 'foreman-check' | 'absences' | 'open-days' | 'check-ins';

export type MockContext = { today: string; projectIds: string[]; workTypeIds: string[][]; phone: string; telegramId: string };

/** Mock files are read from the sources (the mock exists only in development) */
const MOCK_DIR = join(process.cwd(), 'src', 'brigade', 'tma', 'mock');

export function readMock(file: MockFile, ctx: MockContext): unknown {
  const raw = readFileSync(join(MOCK_DIR, `${file}.json`), 'utf-8');
  // A placeholder that is the whole JSON string ("{{project:9}}") can become null
  const filled = raw
    .replace(/"\{\{workType:(\d+):(\d+)\}\}"/g, (_, p: string, k: string) => {
      const id = ctx.workTypeIds[Number(p) - 1]?.[Number(k) - 1];
      return id ? JSON.stringify(id) : 'null';
    })
    .replace(/"\{\{project:(\d+)\}\}"/g, (_, n: string) => {
      const id = ctx.projectIds[Number(n) - 1];
      return id ? JSON.stringify(id) : 'null';
    })
    .replace(/\{\{today([+-]\d+)?\}\}/g, (_, offset?: string) => shiftDate(ctx.today, Number(offset ?? 0)))
    .replace(/\{\{now\}\}/g, new Date().toISOString())
    .replace(/\{\{mockPhone\}\}/g, ctx.phone)
    .replace(/\{\{mockTelegramId\}\}/g, ctx.telegramId);
  return JSON.parse(filled) as unknown;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
