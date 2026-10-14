# 🚀 Публікація проєкту на VPS (перше розгортання)

Покрокова інструкція розгортання ERP на чистому VPS через **Docker Compose** з **Nginx** на хості та безкоштовним SSL-сертифікатом **Let's Encrypt**.

Оновлення вже розгорнутого проєкту описане окремо: [update_deployment.md](./update_deployment.md).

---

## 🧭 Як це влаштовано

```text
Браузер ──HTTPS──▶ Nginx на хості (:443, SSL)
                        │
                        ▼  127.0.0.1:8080
                 ┌───────────── Docker (docker-compose.prod.yml) ─────────────┐
                 │  web  (nginx + зібраний React)                              │
                 │    ├─ /        → статичні файли SPA                         │
                 │    └─ /api/*   → api:3000  (префікс /api відрізається)      │
                 │  api  (NestJS)  ── при старті: prisma migrate deploy        │
                 │    ├─▶ postgres:5432  (volume postgres_data)                │
                 │    └─▶ redis:6379     (volume redis_data, черга BullMQ)     │
                 └─────────────────────────────────────────────────────────────┘
```

- Назовні відкриті лише порти **22, 80, 443**. Postgres, Redis і API доступні тільки всередині Docker-мережі.
- Фронтенд і API працюють на **одному домені**: `https://projects.ispik24.pl` і `https://projects.ispik24.pl/api/...`. API приймає браузерні запити (CORS) лише з домену, вказаного у `FRONTEND_URL`.
- Міграції бази застосовуються **автоматично** при кожному старті контейнера `api`.

### Файли, які стосуються продакшну

| Файл | Призначення |
|---|---|
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Продакшн-стек (postgres, redis, api, web) |
| [`web/Dockerfile.prod`](../web/Dockerfile.prod) | Збирає React-бандл і віддає його через nginx |
| [`web/nginx.conf`](../web/nginx.conf) | nginx усередині контейнера `web`: SPA + проксі `/api` → `api:3000` |
| [`deploy/nginx-host.conf`](../deploy/nginx-host.conf) | Шаблон конфігу Nginx на хості (домен + SSL) |
| [`deploy/deploy.sh`](../deploy/deploy.sh) | Скрипт оновлення (бекап → pull → build → restart) |
| [`deploy/backup-db.sh`](../deploy/backup-db.sh) | Бекап бази даних |

> [!NOTE]
> `docker-compose.yml` у корені — це **dev**-конфігурація (Vite dev-сервер, відкриті порти БД). На сервері його не використовуємо.

---

## 0. Що потрібно підготувати заздалегідь

- [ ] **VPS**: Ubuntu 22.04/24.04 LTS, мінімум **2 vCPU / 4 GB RAM / 30 GB SSD** (збірка образів на 2 GB RAM може падати — тоді додайте swap, див. крок 1.4).
- [ ] **Домен** `projects.ispik24.pl` з **A-записом** на IP сервера (налаштовується в home.pl, див. крок 0.1).
- [ ] Доступ до **GitHub-репозиторію** `kuchinsk1y/construction-project-management-system` (deploy key або Personal Access Token, якщо репозиторій приватний).
- [ ] **SMTP-акаунт** для відправки листів — вхід у систему працює через код на email, без SMTP ніхто не залогіниться. Для Gmail потрібен *App Password*.
- [ ] Файл **`google-credentials.json`** (ключ сервісного акаунта Google) з доступом до таблиці `PROJECTS_SPREADSHEET_ID`.
- [ ] Ключ **`INTEGRATION_API_KEY`** для зовнішньої інтеграції (TMA), якщо вона використовується.

### 0.1. DNS-запис у home.pl

DNS домену `ispik24.pl` обслуговує home.pl (`dns.home.pl`, `dns2.home.pl`, `dns3.home.pl`). На домені є wildcard-запис `*.ispik24.pl → ispik24.pl`, тому без окремого запису `projects.ispik24.pl` вказує на сервер home.pl, а не на VPS.

1. Панель home.pl → **Domeny** → `ispik24.pl` → керування DNS («Strefa DNS» / «Rekordy DNS»).
2. Якщо вже є запис з назвою `projects` (наприклад, `CNAME`) — видаліть його.
3. Додайте запис:

   | Тип | Nazwa / Host | Wartość | TTL |
   |---|---|---|---|
   | `A` | `projects` | публічний IPv4 VPS | `3600` |

4. Записи `ispik24.pl`, `www`, `*` та `MX` **не змінюйте** — на них працюють інші сервіси та пошта.
5. `AAAA` додавайте лише якщо VPS має IPv6. Якщо на домені є записи `CAA`, серед них має бути `letsencrypt.org`.

Перевірка (у відповіді має бути IP VPS, а не `31.70.70.236`):

```bash
nslookup projects.ispik24.pl dns.home.pl
```

```bash
nslookup projects.ispik24.pl 1.1.1.1
```

> [!IMPORTANT]
> Не запускайте certbot (крок 8), поки публічний DNS (`1.1.1.1`) не повертає IP VPS — у Let's Encrypt є ліміт невдалих спроб.

---

## 1. Базове налаштування сервера

Підключіться до сервера під root (або користувачем із sudo):

```bash
ssh root@IP_СЕРВЕРА
```

### 1.1. Оновлення системи

```bash
apt update && apt upgrade -y
apt install -y git curl ufw ca-certificates
timedatectl set-timezone Europe/Warsaw
```

### 1.2. Окремий користувач для деплою

```bash
adduser deploy
usermod -aG sudo deploy
# скопіювати свій SSH-ключ новому користувачу
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Перевірте в **новому** терміналі, що `ssh deploy@IP_СЕРВЕРА` працює, і далі працюйте під `deploy`.

> [!TIP]
> Після перевірки входу по ключу варто вимкнути вхід паролем і root-логін: у `/etc/ssh/sshd_config` встановити `PasswordAuthentication no` і `PermitRootLogin no`, потім `sudo systemctl restart ssh`.

### 1.3. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # спрацює після встановлення nginx (крок 3); або: sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status
```

> [!IMPORTANT]
> Docker публікує порти в обхід UFW. Саме тому в `docker-compose.prod.yml` порт фронту прив'язаний до `127.0.0.1`, а Postgres/Redis/API взагалі не публікуються. Не додавайте `ports:` для цих сервісів на продакшні.

### 1.4. Swap (якщо RAM ≤ 2 GB)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Встановлення Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
```

Вийдіть із сесії та зайдіть знову (щоб застосувалась група `docker`), потім перевірте:

```bash
docker --version
docker compose version
```

---

## 3. Встановлення Nginx і Certbot на хості

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
```

---

## 4. Клонування репозиторію

```bash
sudo mkdir -p /opt/erp
sudo chown deploy:deploy /opt/erp
git clone https://github.com/kuchinsk1y/construction-project-management-system.git /opt/erp
cd /opt/erp
git checkout main
chmod +x deploy/*.sh
```

> [!TIP]
> Для приватного репозиторію найзручніше створити **deploy key** (read-only):
> `ssh-keygen -t ed25519 -f ~/.ssh/erp_deploy -N ""`, додати `~/.ssh/erp_deploy.pub` у GitHub → *Settings → Deploy keys*, і клонувати через `git@github.com:...` з `~/.ssh/config`, де для `github.com` вказано `IdentityFile ~/.ssh/erp_deploy`.

---

## 5. Налаштування змінних середовища

Конфігурація розділена на **два** файли `.env`.

### 5.1. Кореневий `/opt/erp/.env` — параметри бази

```bash
cp .env.example .env
nano .env
```

```dotenv
POSTGRES_USER=erp
POSTGRES_PASSWORD=<згенерований_пароль>
POSTGRES_DB=erp_db

# порт, на якому контейнер web слухає на 127.0.0.1 (для nginx хоста)
WEB_PORT=8080
```

Згенерувати пароль:

```bash
openssl rand -hex 24
```

> [!WARNING]
> Пароль вставляється в `DATABASE_URL`, тому використовуйте лише букви та цифри (`openssl rand -hex` якраз такий). Символи `@ : / ? #` зламають рядок підключення.
>
> Пароль БД задається **тільки при першому старті** Postgres. Якщо змінити його в `.env` пізніше — база його не підхопить (див. розділ «Проблеми»).

Інші змінні з `.env.example` (JWT, EMAIL) у кореневому файлі на продакшні не потрібні — їх читає API з `api/.env`.

### 5.2. `/opt/erp/api/.env` — параметри API

```bash
cp api/.env.example api/.env
nano api/.env
```

```dotenv
# JWT
JWT_SECRET=<openssl rand -hex 64>
JWT_EXPIRES_IN=15m

# Пошта (обов'язково — через неї приходить код входу)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=erp@ваш-домен.eu
EMAIL_PASSWORD=<app_password>
EMAIL_FROM_NAME=ERP

# Домен фронту: посилання в листах + єдине джерело, якому CORS дозволяє запити до API
# (кілька доменів — через кому, без слеша в кінці)
FRONTEND_URL=https://projects.ispik24.pl

# Google Sheets
GOOGLE_CREDENTIALS_FILE=google-credentials.json
PROJECTS_SPREADSHEET_ID=<id_таблиці>
PROJECTS_SHEET_NAME=Zakres
# необов'язково, значення за замовчуванням:
# MILESTONES_SHEET_NAME=KamienieMilowe
# WORK_TYPES_SHEET_NAME=RodzajeRobot
# PLANNED_EXPENSES_SHEET_NAME=Wydatki

# Інтеграція (заголовок x-api-key)
INTEGRATION_API_KEY=<openssl rand -hex 32>

# Telegram: куди надходять звіти з кнопки зворотного зв'язку (bug reporter)
TELEGRAM_BOT_TOKEN=<токен від @BotFather>
TELEGRAM_ADMIN_CHAT_ID=<Telegram ID адміна>
```

> [!NOTE]
> `TELEGRAM_ADMIN_CHAT_ID` — числовий Telegram ID адміна, який отримує звіти (дізнатися свій ID можна, наприклад, через @userinfobot). Адмін має хоча б раз натиснути **Start** у вашому боті, інакше бот не зможе йому писати. Без цих змінних API працює, але надіслати звіт не вийде.

> [!NOTE]
> `PORT`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` в `api/.env` можна не вказувати — `docker-compose.prod.yml` перевизначає їх правильними значеннями для Docker-мережі.

### 5.3. Ключ Google

Скопіюйте файл зі своєї машини на сервер:

```bash
scp google-credentials.json deploy@IP_СЕРВЕРА:/opt/erp/api/google-credentials.json
```

На сервері:

```bash
chmod 600 /opt/erp/api/.env /opt/erp/.env /opt/erp/api/google-credentials.json
```

> [!WARNING]
> Файл `api/google-credentials.json` **має існувати до першого запуску**. Інакше Docker створить на його місці порожню *директорію*, і синхронізація з Google Sheets не працюватиме. Якщо так сталося: `docker compose -f docker-compose.prod.yml down`, `rm -rf api/google-credentials.json`, скопіювати файл, запустити знову.

---

## 6. Перший запуск

```bash
cd /opt/erp
docker compose -f docker-compose.prod.yml up -d --build
```

Перша збірка займає кілька хвилин. Що відбувається:

1. Піднімаються `postgres` і `redis`.
2. Збирається образ `api`; при старті виконується `prisma migrate deploy` (усі міграції з `api/prisma/migrations`), потім запускається NestJS.
3. При старті API автоматично створює/оновлює **адмін-користувачів** (див. `api/src/prisma/prisma.service.ts`), тож у систему відразу можна увійти під їхніми email.
4. Збирається образ `web` (React з `VITE_API_URL=/api`) і запускається nginx на `127.0.0.1:8080`.

Перевірка:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl http://127.0.0.1:8080/api/      # має повернути: Hello World!
```

У логах API мають бути рядки `Admin users seeded successfully on startup.` і `Nest application successfully started`.

### 6.1. (Необов'язково) Тестові дані

Повний сид (`api/prisma/seed.ts`) створює додаткових користувачів і довідники. **Запускайте лише один раз і лише якщо ці дані справді потрібні на продакшні**:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

---

## 7. Nginx на хості і домен

```bash
sudo cp /opt/erp/deploy/nginx-host.conf /etc/nginx/sites-available/erp
sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Тепер `http://projects.ispik24.pl` має відкривати сторінку входу (DNS уже має вказувати на сервер — див. крок 0.1, перевірка: `dig +short projects.ispik24.pl`).

> Якщо змінили `WEB_PORT` у `.env`, змініть і `proxy_pass http://127.0.0.1:8080` у конфігу nginx.

---

## 8. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d projects.ispik24.pl --redirect -m ваш@email --agree-tos
```

Certbot сам додасть SSL у конфіг і редирект з HTTP на HTTPS. Автопродовження вже налаштоване через systemd-таймер, перевірити:

```bash
sudo certbot renew --dry-run
```

---

## 9. Перевірка після розгортання

- [ ] `https://projects.ispik24.pl` відкривається, сертифікат валідний.
- [ ] Вхід: введіть email адміна → приходить лист із кодом → вхід успішний (перевіряє SMTP + JWT).
- [ ] Список проєктів завантажується (перевіряє API + БД).
- [ ] Оновлення сторінки на внутрішньому маршруті (напр. `/projects`) не дає 404 (перевіряє SPA-fallback).
- [ ] Створення/зміна проєкту з'являється в Google-таблиці (перевіряє Redis/BullMQ + Google-ключ). Помилки синхронізації пишуться в таблицю `google_sheets_sync_errors` і в `logs api`.
- [ ] Інтеграція: `curl -H "x-api-key: $KEY" https://projects.ispik24.pl/api/v1/integration/projects` повертає JSON.
- [ ] Bug-reporter (кнопка зворотного зв'язку) надсилає повідомлення зі скріншотом.

---

## 10. Резервні копії бази

Ручний бекап (зберігається в `/opt/erp/backups`, залишаються 14 останніх):

```bash
cd /opt/erp && ./deploy/backup-db.sh
```

Щоденний автоматичний бекап о 03:00:

```bash
crontab -e
```

```cron
0 3 * * * cd /opt/erp && ./deploy/backup-db.sh >> /opt/erp/backups/backup.log 2>&1
```

> [!IMPORTANT]
> Бекап на тому ж сервері не захищає від втрати сервера. Регулярно копіюйте `/opt/erp/backups` в інше місце (інший сервер, S3, Google Drive тощо).

Відновлення з бекапу:

```bash
cd /opt/erp
docker compose -f docker-compose.prod.yml stop api
gunzip -c backups/erp_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U erp -d erp_db
docker compose -f docker-compose.prod.yml start api
```

---

## 11. Корисні команди

Щоб не писати `-f docker-compose.prod.yml` щоразу, можна додати в `~/.bashrc`:

```bash
alias dc='docker compose -f /opt/erp/docker-compose.prod.yml --project-directory /opt/erp'
```

| Дія | Команда |
|---|---|
| Статус контейнерів | `dc ps` |
| Логи API (live) | `dc logs -f --tail=100 api` |
| Перезапуск API | `dc restart api` |
| Зупинити все | `dc down` *(дані в volume зберігаються)* |
| Консоль БД | `dc exec postgres psql -U erp -d erp_db` |
| Статус міграцій | `dc exec api npx prisma migrate status` |
| Використання ресурсів | `docker stats` |
| Місце на диску Docker | `docker system df` |

> [!CAUTION]
> `dc down -v` **видаляє volume з базою даних**. Ніколи не використовуйте `-v` на продакшні без свіжого бекапу.

---

## 12. Проблеми та рішення

| Симптом | Причина / рішення |
|---|---|
| `502 Bad Gateway` на всьому сайті | Контейнер `web` не працює або `WEB_PORT` не збігається з `proxy_pass`. `dc ps`, `dc logs web`. |
| `502` лише на `/api/...` | API впав або ще стартує. `dc logs --tail=100 api`. |
| API постійно перезапускається | Найчастіше — помилка міграції або відсутня обов'язкова змінна (`JWT_SECRET`, `EMAIL_*`, `PROJECTS_*`). Див. `dc logs api`. |
| `P1000: Authentication failed` у логах API | Пароль у `.env` змінили після першого старту Postgres. Поверніть старий або змініть пароль у самій БД: `dc exec postgres psql -U erp -d erp_db -c "ALTER USER erp PASSWORD 'новий';"`, потім `dc up -d api`. |
| Не приходить код входу | Перевірте `EMAIL_*`, для Gmail — App Password; деякі VPS-провайдери блокують вихідний порт 25/587 — уточніть у підтримці. |
| Не синхронізується Google Sheets | Немає/неправильний `api/google-credentials.json` (або це директорія — див. 5.3); сервісному акаунту не надано доступ до таблиці. |
| Збірка падає з `Killed` / `ENOMEM` | Мало RAM — додайте swap (крок 1.4). |
| Фронт звертається до `localhost:3000` | Образ `web` зібраний не з `Dockerfile.prod`. Перезберіть: `dc build --no-cache web && dc up -d web`. |
| У консолі браузера `blocked by CORS policy` | Домен, з якого відкрито сайт, не збігається з `FRONTEND_URL` в `api/.env` (перевірте `https://`, `www`, слеш у кінці). Виправте і виконайте `dc up -d api`. |
| Кнопка зворотного зв'язку повертає помилку | Не задано `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` або адмін не натиснув Start у боті. Див. `dc logs api`. |
