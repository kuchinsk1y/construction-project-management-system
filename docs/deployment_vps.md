# 🚀 Публікація проєкту на VPS (перше розгортання)

Покрокова інструкція розгортання ERP на чистому VPS через **Docker Compose** з **Nginx** на хості та безкоштовним SSL-сертифікатом **Let's Encrypt**.

Оновлення вже розгорнутого проєкту описане окремо: [update_deployment.md](./update_deployment.md).

---

## 🧭 Як це влаштовано

```text
Браузер ──HTTPS──▶ Nginx на хості (:443, SSL)
                        │
                        ▼  127.0.0.1:8081
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

DNS домену `ispik24.pl` обслуговує home.pl (`dns.home.pl`, `dns2.home.pl`, `dns3.home.pl`). IP VPS — **`31.70.70.236`**; на нього вже вказують `ispik24.pl`, `work-journal.ispik24.pl` і `trips.ispik24.pl`.

1. Панель home.pl → **Domeny** → `ispik24.pl` → керування DNS («Strefa DNS» / «Rekordy DNS»).
2. Запис для ERP (уже доданий):

   | Тип | Nazwa / Host | Wartość | TTL |
   |---|---|---|---|
   | `A` | `projects` | `31.70.70.236` | `3600` |

3. Записи інших проєктів та `MX` **не змінюйте**.
4. Якщо на домені є записи `CAA`, серед них має бути `letsencrypt.org`.

Перевірка (у відповіді має бути `31.70.70.236`):

```bash
nslookup projects.ispik24.pl dns.home.pl
```

```bash
nslookup projects.ispik24.pl 1.1.1.1
```

> [!IMPORTANT]
> Не запускайте certbot (крок 8), поки публічний DNS (`1.1.1.1`) не повертає IP VPS — у Let's Encrypt є ліміт невдалих спроб.

### 0.2. ⚠️ На VPS вже працюють інші проєкти

На цьому сервері вже працюють `ispik24.pl`, `work-journal.ispik24.pl` і `trips.ispik24.pl`. Кроки 1–3 написані для **чистого** сервера — на спільному їх **не можна виконувати наосліп**: можна відрізати SSH, зламати інші сайти або конфлікт портів. Спершу огляньте сервер:

```bash
free -h; df -h /; nproc
sudo ss -tlnp | grep -E ':(80|443|8081)\b'   # 8081 — порт ERP за замовчуванням, має бути вільний
systemctl is-active nginx apache2 caddy 2>/dev/null
ls /etc/nginx/sites-enabled/ 2>/dev/null
docker --version; docker compose version; docker ps --format '{{.Names}}\t{{.Ports}}'
sudo ufw status
which certbot
```

Що з цього випливає:

| Що видно | Що робити |
|---|---|
| Порти 80/443 слухає **nginx на хості** | Звичайний випадок. Крок 3 пропустити (лише доставити `certbot`/`python3-certbot-nginx`, якщо їх немає), крок 7 — **без** видалення `default` (див. там). |
| 80/443 слухає **apache2 / caddy** або **Docker-контейнер** (Traefik, nginx-proxy тощо) | Nginx **не встановлювати** — він не зможе зайняти порти й зламає інші сайти. Домен `projects.ispik24.pl` треба додати в наявний проксі з `proxy_pass` на `127.0.0.1:8081` (або підключити контейнер `web` до мережі проксі). |
| Порт **8081** уже зайнятий | Вибрати вільний порт у `WEB_PORT` (крок 5.1) і той самий — у `proxy_pass` (крок 7). Перевірити, що порт вільний: `sudo ss -tlnp | grep :ПОРТ` (порожній вивід = вільний). |
| Docker уже встановлено | Крок 2 пропустити (лише додати свого користувача до групи `docker`, якщо треба). |
| `ufw` неактивний | **Не вмикати** без перевірки, які порти потрібні іншим проєктам, — інакше вони стануть недоступні. Достатньо того, що ERP не публікує жодних портів назовні. |
| Вільної RAM < 1.5 GB | Збірка образів може не вміститися поряд з іншими проєктами — додати swap (крок 1.4), якщо його ще немає (`swapon --show`). |

Postgres і Redis для ERP працюють в окремих контейнерах без опублікованих портів, тож із базами інших проєктів **не конфліктують** — навіть якщо на сервері вже є свій Postgres на `5432`.

---

## 1. Базове налаштування сервера

> [!WARNING]
> Розділи 1.1–1.3 — **лише для нового сервера**. На спільному VPS (див. 0.2) не виконуйте `apt upgrade` під час роботи інших проєктів без плану, не змінюйте часовий пояс, налаштування SSH і firewall.

Підключіться до сервера під root (або користувачем із sudo):

```bash
ssh root@31.70.70.236
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

Перевірте в **новому** терміналі, що `ssh deploy@31.70.70.236` працює, і далі працюйте під `deploy`.

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
WEB_PORT=8081
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

# Fakturownia: імпорт рахунків в етапи (Kamienie milowe)
FAKTUROWNIA_API_TOKEN=<API-токен Fakturownia>
FAKTUROWNIA_PL_SUBDOMAIN=ispik
FAKTUROWNIA_LV_SUBDOMAIN=<субдомен для Латвії>
FAKTUROWNIA_RO_SUBDOMAIN=<субдомен для Румунії>
FAKTUROWNIA_ES_SUBDOMAIN=<субдомен для Іспанії>
```

> [!NOTE]
> `TELEGRAM_ADMIN_CHAT_ID` — числовий Telegram ID адміна, який отримує звіти (дізнатися свій ID можна, наприклад, через @userinfobot). Адмін має хоча б раз натиснути **Start** у вашому боті, інакше бот не зможе йому писати. Без цих змінних API працює, але надіслати звіт не вийде.

> [!NOTE]
> **Fakturownia.** `FAKTUROWNIA_API_TOKEN` — API-токен із налаштувань акаунта Fakturownia (розділ про інтеграцію / API). Субдомен — перша частина адреси акаунта: для `https://ispik.fakturownia.pl` це `ispik`. Субдомен обирається за країною проєкту: Łotwa → `LV`, Rumunia → `RO`, Hiszpania → `ES`, усі інші → `PL`. Якщо `PL` не задано, використовується `ispik`; якщо не задано `LV`/`RO`/`ES` — використовується субдомен `PL`. Без `FAKTUROWNIA_API_TOKEN` API працює, але імпорт рахунків повертатиме помилку *«Fakturownia API token is not configured on the server»*. Якщо в усіх країнах один і той самий акаунт, змінні `LV`/`RO`/`ES` можна не задавати.

> [!NOTE]
> `PORT`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` в `api/.env` можна не вказувати — `docker-compose.prod.yml` перевизначає їх правильними значеннями для Docker-мережі.

### 5.3. Ключ Google

Скопіюйте файл зі своєї машини на сервер:

```bash
scp google-credentials.json deploy@31.70.70.236:/opt/erp/api/google-credentials.json
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
4. Збирається образ `web` (React з `VITE_API_URL=/api`) і запускається nginx на `127.0.0.1:8081`.

Перевірка:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl http://127.0.0.1:8081/api/      # має повернути: Hello World!
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
sudo nginx -t && sudo systemctl reload nginx
```

> [!CAUTION]
> На спільному сервері **не видаляйте** `/etc/nginx/sites-enabled/default` і не чіпайте конфіги інших сайтів. Якщо `nginx -t` показує помилку — **не робіть reload** (інакше впадуть усі сайти): приберіть посилання `sudo rm /etc/nginx/sites-enabled/erp` і розберіться з помилкою. Якщо інші конфіги лежать не в `sites-enabled`, а в `/etc/nginx/conf.d/`, покладіть файл туди як `/etc/nginx/conf.d/erp.conf`.
>
> Перевірте, що інші сайти після reload працюють: `curl -sI https://ispik24.pl | head -1`.

На чистому сервері (без інших сайтів) можна додатково прибрати стандартну сторінку nginx: `sudo rm -f /etc/nginx/sites-enabled/default && sudo systemctl reload nginx`.

Тепер `http://projects.ispik24.pl` має відкривати сторінку входу (DNS уже має вказувати на сервер — див. крок 0.1, перевірка: `dig +short projects.ispik24.pl`).

> Якщо змінили `WEB_PORT` у `.env`, змініть і `proxy_pass http://127.0.0.1:8081` у конфігу nginx.

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
- [ ] Імпорт рахунку з Fakturownia в етапі (Kamień milowy) знаходить рахунки.

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
| Імпорт з Fakturownia: `Fakturownia API returned status: 401` / `404` | `401` — неправильний `FAKTUROWNIA_API_TOKEN`; `404` — неправильний субдомен для країни проєкту (`FAKTUROWNIA_*_SUBDOMAIN`). Після правки `api/.env`: `dc up -d api`. |
