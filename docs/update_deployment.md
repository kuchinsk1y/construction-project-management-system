# 🔄 Оновлення проєкту на VPS

Інструкція для оновлення вже розгорнутого ERP. Перше розгортання описане в [deployment_vps.md](./deployment_vps.md).

Скрізь нижче припускається, що проєкт лежить у `/opt/erp`, а команди виконуються під користувачем `deploy`.

---

## 🧭 Що відбувається при оновленні

```text
git pull  →  docker compose build (api, web)  →  docker compose up -d
                                                     │
                                                     └─ api стартує: prisma migrate deploy → NestJS
```

- **Міграції бази застосовуються автоматично** при старті нового контейнера `api` — окремо запускати їх не потрібно.
- Під час перезапуску контейнерів сайт недоступний **кілька секунд** (до ~30 с, якщо є міграції). Плануйте оновлення поза робочими годинами, якщо в релізі є важкі міграції.
- Дані Postgres і Redis зберігаються у Docker volume і при оновленні не зачіпаються.

---

## ✅ Перед оновленням (на своїй машині)

1. Зміни злиті в гілку, з якої деплоїмо (за замовчуванням **`main`**).
2. Перевірено, що API і фронт збираються (у Docker фронт збирається так само, з перевіркою типів):
   ```bash
   npm --prefix api run build
   ```
   ```bash
   npm --prefix web run build
   ```
3. Якщо змінювалась схема БД — **міграція створена й закомічена** (`api/prisma/migrations/...`). На продакшні виконується лише `migrate deploy`, він **не** генерує міграції зі `schema.prisma`.
4. Якщо додано нові змінні середовища — запишіть їх, їх треба буде додати в `api/.env` на сервері **до** перезапуску.

---

## 🚀 Варіант А: автоматичний скрипт (рекомендовано)

```bash
ssh deploy@IP_СЕРВЕРА
cd /opt/erp
./deploy/deploy.sh
```

Задеплоїти іншу гілку:

```bash
./deploy/deploy.sh vitalii-test-dev
```

Скрипт [`deploy/deploy.sh`](../deploy/deploy.sh) робить:

1. **Бекап бази** (`deploy/backup-db.sh` → `/opt/erp/backups`).
2. `git fetch` + `git checkout <гілка>` + `git pull --ff-only`.
3. `docker compose build api web`.
4. `docker compose up -d` — перестворює лише контейнери, образ яких змінився.
5. Чекає до 60 с, поки `/api/` почне відповідати; якщо ні — завершується з помилкою.
6. Видаляє старі «висячі» образи (`docker image prune`).

> [!NOTE]
> `git pull --ff-only` навмисно відмовиться працювати, якщо на сервері є локальні коміти або історію гілки переписали (force-push). Див. розділ «Проблеми».

---

## 🛠️ Варіант Б: вручну, крок за кроком

```bash
ssh deploy@IP_СЕРВЕРА
cd /opt/erp
```

**1. Бекап бази**

```bash
./deploy/backup-db.sh
```

**2. Запам'ятати поточну версію (для відкату)**

```bash
git log -1 --oneline
```

**3. Отримати код**

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
```

**4. Переглянути, що змінилось** (особливо міграції та env)

```bash
git diff --stat HEAD@{1} HEAD
git diff HEAD@{1} HEAD -- api/prisma/migrations api/.env.example .env.example docker-compose.prod.yml
```

**5. Додати нові змінні середовища** (якщо з'явились у `api/.env.example`)

```bash
nano api/.env
```

**6. Зібрати і перезапустити**

```bash
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d
```

**7. Перевірити**

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl http://127.0.0.1:8080/api/
```

**8. Прибрати старі образи**

```bash
docker image prune -f
```

---

## 🎯 Часткові оновлення

| Що змінилось | Команди |
|---|---|
| Лише фронтенд (`web/`) | `dc build web && dc up -d web` |
| Лише бекенд (`api/`) або міграції | `dc build api && dc up -d api` |
| Лише `api/.env` (без коду) | `dc up -d api` *(compose перестворить контейнер з новими змінними; `restart` їх **не** підхоплює)* |
| `google-credentials.json` | `dc restart api` |
| `docker-compose.prod.yml` | `dc up -d` |
| `web/nginx.conf` | `dc build web && dc up -d web` |
| `deploy/nginx-host.conf` (nginx хоста) | скопіювати вручну в `/etc/nginx/sites-available/erp` (зберігши блоки, які додав certbot), `sudo nginx -t && sudo systemctl reload nginx` |

(`dc` — alias із розділу «Корисні команди» в [deployment_vps.md](./deployment_vps.md#11-корисні-команди); без нього пишіть `docker compose -f docker-compose.prod.yml`.)

> [!TIP]
> Після оновлення фронту користувачам може знадобитися оновити сторінку. `index.html` віддається з `Cache-Control: no-cache`, а файли з `/assets/` мають хеш у назві, тож старий кеш браузера проблем не створює.

---

## ✔️ Перевірка після оновлення

- [ ] `dc ps` — усі сервіси `Up`, `api` не перезапускається по колу.
- [ ] У `dc logs api` немає помилок міграцій, є `Nest application successfully started`.
- [ ] `dc exec api npx prisma migrate status` → `Database schema is up to date!`
- [ ] Сайт відкривається, вхід працює, список проєктів завантажується.
- [ ] Перевірено функціонал, який змінювався в релізі.

---

## ⏪ Відкат (rollback)

### Якщо проблема лише в коді (міграцій у релізі не було)

```bash
cd /opt/erp
git log --oneline -10                 # знайти попередній робочий коміт
git checkout <SHA_попереднього_коміту>
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d
```

Після виправлення повернутись на гілку: `git checkout main`, потім звичайний деплой.

### Якщо в релізі була міграція

Prisma **не відкочує** міграції автоматично. Старий код із новою схемою може не працювати, тому найнадійніше — відновити бекап, зроблений перед оновленням:

```bash
cd /opt/erp
git checkout <SHA_попереднього_коміту>
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml stop api

ls -lt backups/ | head               # останній бекап — зроблений перед деплоєм
gunzip -c backups/erp_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U erp -d erp_db

docker compose -f docker-compose.prod.yml up -d
```

> [!WARNING]
> Відновлення бекапу **видаляє всі дані, внесені після нього**. Якщо після деплою користувачі вже вносили дані, краще виправити проблему новим релізом (fix forward), ніж відкочуватись.

---

## 🧯 Проблеми під час оновлення

| Симптом | Рішення |
|---|---|
| `fatal: Not possible to fast-forward` | На сервері є локальні зміни або гілку перезаписали. Переглянути: `git status`, `git log origin/main..HEAD`. Якщо локальні зміни не потрібні: `git reset --hard origin/main` (**видаляє** локальні правки в tracked-файлах; `.env` і `google-credentials.json` не зачіпаються, бо вони в `.gitignore`). |
| `error: Your local changes would be overwritten` | Хтось редагував файли прямо на сервері. `git stash` або `git diff`, щоб зрозуміти, що це, потім вирішити — зберегти чи скинути. |
| API в циклі перезапусків після деплою | `dc logs --tail=200 api`. Зазвичай: помилка міграції або нова обов'язкова змінна, якої немає в `api/.env`. |
| `migrate deploy` скаржиться на failed migration (`P3009`) | Міграція впала посередині. Виправити дані/схему вручну, потім позначити: `dc run --rm api npx prisma migrate resolve --rolled-back <назва_міграції>` (або `--applied`), і знову `dc up -d api`. За сумнівів — відновити бекап. |
| Збірка падає з `Killed` | Не вистачає RAM — додайте swap (див. [deployment_vps.md, крок 1.4](./deployment_vps.md#14-swap-якщо-ram--2-gb)). |
| Закінчується місце на диску | `docker system df`, потім `docker image prune -a -f` і `docker builder prune -f`. Перевірте розмір `/opt/erp/backups`. |
| Після деплою фронт показує старі дані/версію | Жорстке оновлення сторінки (Ctrl+F5). Переконайтесь, що образ `web` перезібрано: `dc build web && dc up -d web`. |
