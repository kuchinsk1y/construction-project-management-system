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

## Where the data comes from

Foremen are **not ERP users**. Everything about a foreman comes from **TMA**:

| Data | Source |
|---|---|
| Is this phone a foreman, his name and Telegram ID | TMA |
| His crew: name, company, position, rate | TMA (with the same answer) |
| His projects | TMA gives ERP project ids; names, cities, departments, work types from ERP |
| Vacations, sick leave, dismissals | TMA |
| Surcharges («Warunki») | ERP (Ustawienia → Dopłaty) |
| Entries (history, hours) | not stored yet — history and hours are empty until saving the day is built |

Google Sheets of ST_BR are not read any more.

## TMA contract

Header `x-api-key: TMA_API_KEY` on both requests.

**1. Foreman by phone** — `GET {TMA_API_URL}{TMA_FOREMAN_CHECK_PATH}?phone=+48123456789`
(default path `/v1/integration/foremen/check`). `404` = not a foreman.

```json
{
  "isForeman": true,
  "foreman": { "id": 7, "firstName": "Andrzej", "lastName": "Kowal", "phone": "+48123456789", "telegramId": "784892922" },
  "crew": [
    { "id": 101, "firstName": "Adam", "lastName": "Nowak", "company": "ISPIK", "position": "Monter", "rate": 28, "projectId": "1c2d…" },
    { "id": 301, "firstName": "Ivan", "lastName": "Kovalenko", "company": "M2Solar", "position": "Monter", "rate": null, "projectId": "1c2d…" }
  ],
  "projectIds": ["1c2d…-uuid-of-ERP-project"]
}
```

`projectIds` and `crew[].projectId` are ERP project ids (`projects.id`), the same ones TMA gets from `GET /v1/integration/projects`.
`crew[].projectId` is where the person works now: the form opens with it chosen in his first row,
and the foreman's card with the project most of the crew is on. Unknown ids are ignored.

**2. Absences of the crew** — `GET {TMA_API_URL}{TMA_FOREMAN_ABSENCES_PATH}?dateFrom=2026-11-01&dateTo=2026-11-30`
(default path `/v1/integration/foremen/:id/absences`, `:id` = `foreman.id`).

`type`: `vacation` (urlop) | `sick` (chory) | `day_off` (wolne) | `absence` (absencja) | `drunk` (pijaństwo) |
`drunk_on_site` (pijaństwo na budowie) | `dismissed` (zwolniony). People absent that day get **no card** in the form;
together with people without a check-in they are listed in «Nie pracują dziś» grouped by reason.
The work type list in the form has only the project's work types (absences come from TMA).

```json
{ "absences": [
  { "workerId": 103, "type": "vacation",  "dateFrom": "2026-11-08", "dateTo": "2026-11-15" },
  { "workerId": 202, "type": "sick",      "dateFrom": "2026-11-10", "dateTo": "2026-11-12" },
  { "workerId": 401, "type": "dismissed", "dateFrom": "2026-11-13", "dateTo": "2026-11-13" }
] }
```

**3. Days open for filling in** — `GET {TMA_API_URL}{TMA_FOREMAN_OPEN_DAYS_PATH}?dateFrom=2026-11-01&dateTo=2026-11-30`
(default path `/v1/integration/foremen/:id/open-days`). Every day not listed is closed.

```json
{ "openDays": ["2026-11-09", "2026-11-10", "2026-11-11"] }
```

The form's calendar shows only these days as clickable and opens on today (when open) or the latest open day before it.
A closed day is read-only and cannot be saved.

ERP asks TMA again at most once a minute per foreman. If TMA stops listing the number as the same foreman,
his session gets `403` on the next request.

**4. QR check-ins of the crew on one day** — `GET {TMA_API_URL}{TMA_FOREMAN_CHECK_INS_PATH}?date=2026-11-16`
(default path `/v1/integration/foremen/:id/check-ins`). Same statuses and fields as the live attendance TMA already gives ERP.
People without a check-in that day are not in the list.

```json
{
  "date": "2026-11-16",
  "generatedAt": "2026-11-16T07:30:00Z",
  "checkIns": [
    { "id": "98d4de2f-…", "workerId": 101, "projectId": "1c2d…", "status": "open", "checkInAt": "2026-11-16T05:52:10Z", "checkInMethod": "qr", "closedAt": null,
      "workTypeId": "6f0c…", "workDescription": "Betonowanie stóp, sektor B" },
    { "id": "5e1a…", "workerId": 104, "projectId": "7a8b…", "status": "closed", "checkInAt": "2026-11-16T06:03:02Z", "checkInMethod": "manual", "closedAt": "2026-11-16T15:01:00Z" }
  ]
}
```

`status`: `open` | `close_requested` | `closed` | `auto_closed`; `checkInMethod`: `qr` | `manual` | `self`.
`id` — uuid of the TMA work day event (required); it is saved with the hours as `work_hours.work_day_event_id`.
Ids of people are TMA numbers: foreman (manager) — int, worker — bigint (strings with digits are accepted too).
Optional: `workTypeId` — ERP work type (`project_work_types.id`) the worker chose in TMA, and `workDescription` — what he wrote
about the day. The form starts the row with them («Rodzaj», «Uwagi»); the foreman can change both.
A worker who moved between projects has **several check-ins that day, one per project visit** (same `workerId`).
In the form his card gets one block per check-in: the project (locked, from TMA) with the visit time in one badge
(«06:52–10:30», «11:05–…» while open) and its own lines «Rodzaj / Godziny / Warunki / Uwagi». «+» adds another work type
to the same project. Hours of the first line of a block are filled in from that visit (to 0.5 h; the whole card max 16)
and can be changed; not filled while the visit is open or when TMA closed it by itself (`auto_closed`, amber badge).

### Mock (development)

`BRIGADE_TMA_MODE=mock`: answers come from `api/src/brigade/tma/mock/*.json`, **exactly in the TMA format above**
(`foreman-check.json`, `absences.json`, `open-days.json`, `check-ins.json` — the last one holds several days),
and go through the same parsing as real answers. Only `BRIGADE_MOCK_PHONE` is a foreman; codes go to `BRIGADE_MOCK_TELEGRAM_ID`.

Placeholders filled in when a file is read, so the mock does not get old and fits any database:
`{{today}}`, `{{today-3}}`, `{{today+4}}` (date, Warsaw time), `{{now}}`, `{{project:1}}`… (N-th active ERP project, most work types first; missing → `null`),
`{{mockPhone}}`, `{{mockTelegramId}}`. Edit the files to try other cases; no restart needed. The API refuses to start with the mock in production.

## Sign-in

1. Phone number (country + number, E.164).
2. TMA confirms it is a foreman and gives his Telegram ID (no ERP user needed).
3. API sends a 6-character code to that Telegram via the bot.
4. Code → session until 23:59:59 (Europe/Warsaw). A new day means a new sign-in.

Codes and sessions are in `brigade_auth_codes` and `brigade_sessions` (separate from the ERP e-mail sign-in).
The access token carries the session id: signing out ends access at once. The refresh token rotates; an old one works once.

API: `POST /brigade/auth/send-code`, `/verify-code`, `/refresh`, `/logout`; `GET /brigade/me`.
Brigade tokens open only `/brigade/*`; ERP tokens do not open `/brigade/*`.

Settings in `api/.env`:

| Variable | Meaning |
|---|---|
| `TELEGRAM_AUTH_BOT_TOKEN` | bot that sends codes (empty = `TELEGRAM_BOT_TOKEN`). No token outside production: the code is printed in the API log |
| `BRIGADE_TMA_MODE` | `http` — ask TMA; `mock` — made-up foreman and crew (development only) |
| `TMA_API_URL`, `TMA_API_KEY`, `TMA_FOREMAN_CHECK_PATH`, `TMA_FOREMAN_ABSENCES_PATH`, `TMA_FOREMAN_OPEN_DAYS_PATH`, `TMA_FOREMAN_CHECK_INS_PATH` | TMA requests above |
| `BRIGADE_MOCK_PHONE`, `BRIGADE_MOCK_TELEGRAM_ID` | mock only: the foreman's number and where his codes go |
| `AUTH_TIME_ZONE` | session end time zone, default `Europe/Warsaw` |

Limits: a new code at most every 45 s and 5 per 15 min; 5 wrong codes burn the code.

## Table `work_hours` (nothing writes to it yet)

One line of the day form = one row: worker × project × work type on a date.

| column | type | from |
|---|---|---|
| id | uuid | generated |
| created_at | timestamptz | now |
| work_date | date | form date |
| project_id | uuid → projects | project of the check-in |
| work_type_id | uuid → project_work_types | «Rodzaj» |
| manager_id / manager_name | int? / varchar? | foreman (TMA) |
| worker_id | bigint | TMA worker id |
| worker_name, worker_company_name, position | varchar | TMA crew on that day |
| work_day_event_id | uuid | TMA check-in (`checkIns[].id`); several lines can share one |
| hours | int | «Godziny» |
| note | varchar | «Uwagi» |

«Warunki» go to `work_hour_surcharges` (work_hour_id, surcharge_id, rate_per_hour — the rate of that day), many-to-many like `user_roles`.

## Screens and endpoints (brigade token)

| Screen | Endpoint | Now |
|---|---|---|
| Pulpit | `GET /brigade/pulpit` (`?fresh=1` asks TMA again) | crew and projects from TMA; 14-day hours empty (`activity.source: "none"`) |
| Dziennik prac → Historia | `GET /brigade/work-log?days=1..14` | empty (`source: "none"`) |
| Dziennik prac → Dodaj wpis | `GET /brigade/day-form/calendar?month=RRRR-MM` (open days, day to start on); `GET /brigade/day-form?date=RRRR-MM-DD` (`dayOpen`) | crew + absences of the date (TMA), projects with work types + «Serwis», surcharges; checks only, nothing is saved |
| Raport godzin | `GET /brigade/hours-report?month=RRRR-MM&company=` | no hours yet; absences from TMA shown as `U` / `C` / `Z` |

Row kinds (colours in the app): `work` green, `extra` «Roboty dodatkowe / Inne…» amber, `day_off` Wolne grey,
`vacation` Urlop blue, `sick` Chory violet, `dismissed` Zwolniony dark grey, `absence` Absencja orange, `penalty` Pijaństwo… red.
Report marks: `U` urlop, `C` chory, `W` wolne, `Z` zwolniony, `A` absencja, `K` kara; more than 12 h a day is orange.

## Build

```bash
npm run build      # dist/
```
