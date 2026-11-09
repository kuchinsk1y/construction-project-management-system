# Dziennik brygadzisty (brigade app)

Web app for foremen: daily work log. Second frontend of the ERP — uses the same API (`../api`).
Stack: React 19 + Vite + TypeScript + Tailwind 3.4, same palette and font as the ERP web app. UI language: Polish.

## Run locally

```bash
# 1. API (from the repo root) — already used by the ERP web app
npm --prefix api run start:dev

# 2. This app
cd brigade
npm install
npm run dev        # http://localhost:5174
```

`VITE_API_URL` (see `.env.example`) — API address, default `http://localhost:3000`.
The API must allow this origin: `FRONTEND_URL=http://localhost:5173,http://localhost:5174` in `api/.env`.

## Sign-in

1. Phone number (country + number, E.164).
2. API finds an active ERP user with this phone, asks TMA whether it is a foreman and for his Telegram ID.
3. API sends a 6-character code to that Telegram via the bot.
4. Code → tokens valid until 23:59:59 (Europe/Warsaw). A new day means a new sign-in.

API: `POST /brigade/auth/send-code`, `/verify-code`, `/refresh`, `/logout`; `GET /brigade/me`.
Brigade tokens open only `/brigade/*`; ERP tokens do not open `/brigade/*`.

Settings in `api/.env`:

| Variable | Meaning |
|---|---|
| `TELEGRAM_AUTH_BOT_TOKEN` | bot that sends codes. Empty outside production: the code is printed in the API log (`[DEV] … Login code …`) |
| `BRIGADE_TMA_MODE` | `http` — ask TMA; `stub` — every number is a foreman (development only, API refuses to start with it in production) |
| `TMA_API_URL`, `TMA_API_KEY`, `TMA_FOREMAN_CHECK_PATH` | TMA check: `GET {TMA_API_URL}{path}?phone=+48…` → `{ "isForeman": true, "telegramId": "123" }`, 404 = not a foreman |
| `BRIGADE_STUB_TELEGRAM_ID` | where codes go while `BRIGADE_TMA_MODE=stub` |
| `AUTH_TIME_ZONE` | session end time zone, default `Europe/Warsaw` |

Limits: a new code at most every 45 s and 5 per 15 min; 5 wrong codes burn the code.

## Pulpit

`GET /brigade/pulpit` (brigade token; `?fresh=1` skips the 1-minute cache).

| Block | Source |
|---|---|
| Projects of the foreman | ERP: `project_department_foremen` (not finished projects) |
| Crew: ISPIK, ISPIK Łotwa, agencies, positions | ST_BR Google Sheets, matched by the foreman's **last name** (column «kierownik bezpośredni» / `foreman`) |
| Hours of the last 14 days, last entry | ST_BR work journal sheet, matched by **"First Last"** (column `kierownik`) |

Sheets are read with the same service account as `GOOGLE_CREDENTIALS_FILE` (it must have access).
Variables: `STBR_*` in `api/.env` (see `.env.example`); prefixed because `PROJECTS_SPREADSHEET_ID` is already used by the ERP sync.
If a sheet fails, the rest is still shown with a warning.

## Dziennik prac → Historia

`GET /brigade/work-log` (`?days=1..14`, default 14; `?fresh=1` skips the 30 s cache).
The foreman is always the signed-in user — there is no name parameter.

Answer: days (newest first) → workers → rows. Names and companies come from the entry itself, so dismissed people still show.
Each row has `workType.kind` — the app colours it by meaning:
`work` (green), `extra` «Roboty dodatkowe / Inne…» (amber), `day_off` Wolne (grey), `vacation` Urlop (blue),
`sick` Chory (violet), `dismissed` Zwolniony (dark grey), `absence` Absencja (orange), `penalty` Pijaństwo… (red).
`surcharge.ratePerHour` — dopłata in PLN/h (no rates or totals are shown to the foreman).

Source now: the ST_BR work journal sheet (`source: "sheets"`); project names are linked to ERP projects when they match.
When entries move to ERP, only the server changes (`source: "erp"`, `status` per day), the answer stays the same.

## Raport godzin

`GET /brigade/hours-report?month=RRRR-MM&company=` (month default current; any month from 2024-01, not the future; `?fresh=1` skips the 1-minute cache).
Only the signed-in foreman's people. The server counts everything, the app only draws:
`dates[]` of the month; per worker `hours[i]` (summed per day) and `marks[i]` for `dates[i]`, `total`; `totals`; `filters.companies` of the month;
`overtimeThreshold` (12 h, cells above it are orange).
Marks for days without working hours: `U` urlop, `C` chory, `W` wolne, `Z` zwolniony, `A` absencja, `K` kara.
Workers are grouped by company + id (ids of ISPIK and agency sheets can repeat); the name is the newest one in the month.

## Build

```bash
npm run build      # dist/
```
