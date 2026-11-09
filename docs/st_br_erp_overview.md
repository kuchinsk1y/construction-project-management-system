# ERP для ST_BR — что есть и что предлагаем

Ответ на вопросы команды ST_BR. Статус: сбор информации и согласование; кроме доплат, ничего не реализовано.
Дополняет [st_br_integration.md](st_br_integration.md) (там готовый контракт доплат) и [daily_reports_integration.md](daily_reports_integration.md) (план рапортов TMA → ERP).

---

## 1. Что уже есть в ERP

**Стек.** API: NestJS 11 + Prisma 7 + PostgreSQL (`api/`). Фронт: React + Vite + TypeScript + TanStack Query (`web/`). Синхронизация части таблиц с Google Sheets (проекты, КМ, виды работ, плановые расходы) — `api/src/google-sheets`, `api/src/projects/projects-sync.consumer.ts`.

**Модели (Prisma, `api/prisma/schema.prisma`):**

| Сущность | Таблица | Что важно для ST_BR |
|---|---|---|
| Пользователи ERP | `users` | сотрудники офиса и бригадиры (роль `foreman`), подрядчики. **Рабочих здесь нет.** |
| Роли | `users.roles` (массив строк) | `admin`, `operational_director`, `financial_director`, `project_manager`, `foreman`, `contractor`, `viewer`. Таблицы `roles` / `user_roles` есть, но не используются |
| Объекты | `projects` | id (UUID), название, статус (`ACTIVE`…), город, координаты, руководитель (`manager_id → users.id`), подрядчик |
| Точки сбора на объекте | `project_gathering_points` | несколько на проект, название + координаты |
| Этапы | `milestones` | КМ и RD (дополнительные работы) |
| Виды работ | `project_work_types` | название, **единица (`unit`: szt, mb, m3…)**, план (`total_quantity`), этап, отдел, даты |
| Отделы и бригадиры на объекте | `departments`, `project_departments`, `project_department_foremen` | какие бригадиры (`users`) отвечают за какой отдел на каком объекте |
| Факт по видам работ | `daily_reports` | день × вид работы: `actual_quantity`, `actual_hours`, `actual_workers`. От суммы `actual_quantity` считается прогресс |
| План часов | `project_hours_plan`, `project_work_types.hours_percentage` | ставка и распределение часов по работам |
| Подрядчики / фирмы | `contractors` | можно использовать как «firma» (ISPIK, агентства) |
| Доплаты | `surcharges` | **готово**: ставка за час, период, `is_active`, управление в «Ustawienia» только у админа |

Чего в ERP **нет**: рабочих, бригад и их состава, отпусков, увольнений, журнала часов по работникам, оценок.

**Эндпоинты для интеграций** (`/v1/integration/...`, ключ в заголовке `x-api-key`):
- `GET /v1/integration/projects`, `GET /v1/integration/projects/:id` — объекты, с выбором полей `fields` (`api/src/integration`);
- `GET /v1/integration/surcharges` — доплаты (для ST_BR, свой ключ `ST_BR_API_KEY`).

**Аутентификация.**
- Пользователи ERP: код на **email** → JWT access (15 мин) + refresh-токен (`api/src/auth`). Каждый запрос проверяет глобальный guard: токен, активность пользователя, роль (`api/src/auth/access.guard.ts`).
- Сервисы: заголовок `x-api-key`, у каждого клиента свой ключ (`api/src/integration/guards/integration-key.guard.ts`): TMA — `INTEGRATION_API_KEY`, ST_BR — `ST_BR_API_KEY`.

**Связь с TMA.**
- ERP → TMA: только чтение явки «кто сейчас на объекте» — `GET {TMA_API_URL}/v1/integration/attendance/live` с `x-api-key: TMA_API_KEY`, кэш 15 с (`api/src/attendance/tma.client.ts`, `attendance.controller.ts`). Ответ содержит бригады, работников (ID TMA), отметки, причины отсутствия (`vacation`, `sick_leave`…).
- TMA → ERP: `GET /v1/integration/projects` (объекты).
- Отправки кодов через TMA (send-code / verify) в ERP **нет** — вход в ERP по email и свой. ST_BR лучше обращаться за этим напрямую в TMA.

## 2. Как ERP идентифицирует человека

| Поле | Тип | Уникально | Комментарий |
|---|---|---|---|
| `users.id` | целое | да | основной ключ в ERP |
| `email` | строка | да | по нему вход в ERP |
| `phone_number` | строка до 16 знаков, формат `+48…` | **да** | заполнен у всех пользователей ERP |
| `telegram_id` | число | нет | может быть пустым |

- **Бригадир** есть в ERP как пользователь с ролью `foreman` → для сопоставления подходит **номер телефона** (ST_BR входит по нему, в ERP он уникален) или `users.id`. Рекомендуем: ST_BR при входе находит ERP `users.id` по телефону один раз и дальше передаёт его.
- **Работник** в ERP отсутствует → ключ — **ID работника в TMA** (как уже заложено в плане TMA). ERP хранит только этот ID и имя «снимком» на дату записи.

## 3. Предлагаемый контракт

Общее: JSON, `camelCase`; даты `YYYY-MM-DD` (рабочий день по Польше), время ISO 8601 UTC; деньги — число, PLN; заголовок `x-api-key: <ST_BR_API_KEY>`.

**Чтение (ERP → ST_BR):**

| Метод | Путь | Что отдаёт |
|---|---|---|
| GET | `/v1/integration/foremen/by-phone?phone=+48…` | ERP-пользователь-бригадир: `id`, имя, активен ли |
| GET | `/v1/integration/projects?foremanId=` | объекты, где бригадир назначен (через отделы проекта) |
| GET | `/v1/integration/projects/:id/work-types` | виды работ: `id`, название, `unit`, отдел, этап, `totalQuantity`, `doneQuantity` |
| GET | `/v1/integration/progress?projectId=&dateFrom=&dateTo=` | сделано по дням и видам работ (объём, часы, люди) |
| GET | `/v1/integration/projects/:id/open-days?foremanId=` | даты, за которые ещё можно вносить данные |
| GET | `/v1/integration/surcharges?dateFrom=&dateTo=` | доплаты — **готово** |
| GET | `/v1/integration/work-entries?foremanId=&dateFrom=&dateTo=` | история записей (например, за 14 дней) |

Сотрудники бригады, отпуска и увольнения — **не в ERP**, это данные TMA (или текущих таблиц ST_BR). ERP может проксировать TMA, если нужно ходить только в ERP.

**Запись (ST_BR → ERP):** `PUT /v1/integration/work-days/:id` — одна карточка «бригадир × объект × день» целиком (повторная отправка того же `id` заменяет данные, пока день открыт):

```json
{
  "id": "5c1b9a0e-…",
  "foremanId": 34,
  "projectId": "1c2d…",
  "date": "2026-11-05",
  "comment": "Opóźnienie dostawy paneli",
  "quantities": [{ "workTypeId": "6f0c…", "quantity": 120 }],
  "entries": [
    { "id": "e1…", "workerExternalId": "43", "workerName": "Jan Kowalski", "company": "ISPIK",
      "workTypeId": "6f0c…", "hours": 6, "difficultConditions": true, "comment": "" },
    { "id": "e2…", "workerExternalId": "43", "workerName": "Jan Kowalski", "company": "ISPIK",
      "workTypeId": "7a1d…", "hours": 2, "difficultConditions": false }
  ],
  "ratings": [{ "workerExternalId": "43", "rating": 4 }]
}
```

Ответ `200`/`201`: сохранённая карточка + **расчёт ERP** по каждой строке (ставка, доплата, сумма), чтобы ST_BR только показал.

**Идемпотентность.** `id` карточки и строк генерирует ST_BR (UUID). `PUT` по тому же `id` — замена, а не дубль; повтор с тем же содержимым безопасен.

**Если ERP недоступна.** ST_BR кладёт карточку в свою очередь (outbox) и повторяет:

| Код | Значение | Повторять? |
|---|---|---|
| `200` / `201` | сохранено | — |
| `400` / `422` | ошибка данных (нет вида работы, чужой объект, часы > 24…) | нет, показать бригадиру |
| `401` / `403` | ключ неверный / нет прав | нет, сообщить администратору |
| `409` | конфликт (день правился в ERP после отправки) | нет, перечитать и показать |
| `423` | день закрыт для правок | нет |
| `429`, `5xx`, таймаут | временно | да, с растущей паузой |

## 4. Изменения в ERP (предложение)

| Таблица / поле | Назначение |
|---|---|
| `work_days` (id UUID от ST_BR, project_id, foreman_user_id, date, comment, submitted_at, source, deleted_at) | карточка «бригадир × объект × день» |
| `work_entries` (id UUID, work_day_id, worker_external_id, worker_name, company, work_type_id, hours, difficult_conditions, surcharge_amount, rate, total, comment) | строки работ: одна на работника × вид работы |
| `worker_ratings` (work_day_id, worker_external_id, rating 1–5) | пятничные оценки |
| `daily_reports` + `work_day_id` | объём за день по виду работы (уже считается прогрессом) |
| `surcharges` | **готово** |
| ставка работника | нужно решить, где хранится (см. вопросы) |

Таблица `work_hours` из drawSQL заменяется на `work_days` + `work_entries`, чтобы не держать две похожие структуры.

Права: эндпоинты интеграции — только по ключу ST_BR; в интерфейсе ERP журнал видят руководители (просмотр), правят прошлые дни — только админ; страница доплат — только админ (готово).

## 5. Вопросы и риски

1. **Рапорты присылает ST_BR или TMA?** В плане ERP рапорты бригадира шли из TMA. Должен быть один источник.
2. **Откуда рабочие, отпуска, увольнения?** В ERP их нет. Варианты: TMA (явка с причинами отсутствия там уже есть) или текущие таблицы ST_BR.
3. **Ставка работника (stawka) и премия:** где хранятся и кто их меняет? Без этого ERP не может считать сумму.
4. **Trudne warunki:** всегда «+2 PLN/ч» = одна доплата из таблицы `surcharges`? Тогда ERP берёт ставку оттуда, а не константу.
5. **Правило открытых дней:** сколько дней назад бригадир может править; кто закрывает день.
6. **Firma:** ISPIK / ISPIK Латвия / агентства — заводим их как `contractors` в ERP или храним текстом?
7. **Единицы измерения:** `unit` уже есть у каждого вида работ; нужен ли фиксированный список единиц.
8. **Сводка по объектам и журнал бригадира** из ST_BR — это `quantities` + `comment` карточки, или нужны отдельные поля?
9. Риск: пока ERP недоступна, бригадир видит только локальные данные ST_BR; нужно показывать статус «отправлено / в очереди».
