# 🛠️ Architektura i Stos Technologiczny

System ERP jest zbudowany jako **monorepo** z wyraźnym podziałem na aplikację kliencką (Frontend) oraz serwer (Backend). Takie podejście pozwala na łatwe współdzielenie typów TypeScript oraz ujednolicone zarządzanie repozytorium.

---

## 🏗️ Stos Technologiczny

### Backend (`/api`)
Serwer aplikacji został zbudowany z myślą o skalowalności i bezpieczeństwie.

*   **Framework:** [NestJS](https://nestjs.com/) — pozwala na tworzenie wysoce testowalnych, skalowalnych, luźno powiązanych i łatwych w utrzymaniu aplikacji.
*   **Baza Danych:** [PostgreSQL](https://www.postgresql.org/) (wersja 15+) — niezawodna relacyjna baza danych.
*   **ORM:** [Prisma](https://www.prisma.io/) — zapewnia typowanie dla zapytań bazodanowych. Wykorzystujemy `pgPool` oraz Driver Adapters.
*   **Język:** TypeScript.
*   **Kolejkowanie Zadań:** [Redis](https://redis.io/) + [BullMQ](https://bullmq.io/) (do obsługi asynchronicznych workerów i synchronizacji).
*   **Architektura:** RESTful API.
*   **Uwierzytelnianie:** Jednorazowe kody e-mail (AuthCodes) oraz JWT.

### Frontend (`/web`)
Interfejs użytkownika kładzie duży nacisk na nowoczesny, czytelny design (Glassmorphism, Dark Mode) i płynność działania (mikro-animacje).

*   **Rdzeń:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) (ekstremalnie szybki build i hot-reload).
*   **Zarządzanie Stanem / API:** [TanStack Query](https://tanstack.com/query/latest) (React Query) — zapewnia wydajne cashowanie i synchronizację danych z backendem.
*   **Stylizacja:** [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS framework.
*   **Komponenty UI:** [shadcn/ui](https://ui.shadcn.com/) oparte o Radix Primitives i Base UI (dostępność i gotowe, konfigurowalne elementy interfejsu).
*   **Ikony:** Lucide React.

---

## 🚀 Środowisko Uruchomieniowe (Getting Started)

System może być uruchamiany lokalnie na maszynie hosta lub skonteneryzowany za pomocą Dockera.

> [!NOTE]
> Zanim zaczniesz, upewnij się, że posiadasz zainstalowany Node.js (dla lokalnego uruchomienia) lub Docker Desktop (dla środowiska skonteneryzowanego).

### Opcja A: Docker Compose (Rekomendowana) 🐳

Najprostszy sposób na uruchomienie pełnego stosu (Baza danych, Redis, API, Web).

```bash
# W głównym katalogu projektu:
cp .env.example .env

# Zbuduj i uruchom wszystkie kontenery w tle:
docker compose up -d --build
```

**Dostępne Serwisy:**
*   **Frontend (Web):** `http://localhost:5173`
*   **Backend (API):** `http://localhost:3000`
*   **Baza Danych:** PostgreSQL na porcie `5432`
*   **Redis:** na porcie `6379`

### Opcja B: Uruchomienie Lokalne (Bez Dockera)

Jeśli chcesz rozwijać aplikację lokalnie, musisz najpierw uruchomić bazę danych i Redisa (np. przez `docker compose up -d postgres redis`), a następnie uruchomić API i Web z osobnych terminali.

#### 1. Uruchomienie Backend API

```bash
cd api
cp .env.example .env
npm install
npx prisma generate
npm run start:dev
```

#### 2. Uruchomienie Frontend Web

```bash
cd web
cp .env.example .env
npm install
npm run dev
```
