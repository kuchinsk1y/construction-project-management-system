# ERP Monorepo

Stack:
- api: NestJS + Prisma + PostgreSQL + TypeScript
- web: React + Vite + Tailwind + shadcn/ui + TypeScript
- Docker Compose: PostgreSQL + API + Web

## 1) Local run without Docker

API:
- cd api
- copy .env.example .env
- npm install
- npx prisma generate
- npm run start:dev

Web:
- cd web
- copy .env.example .env
- npm install
- npm run dev

## 2) Run with Docker

From repository root:
- copy .env.example .env
- docker compose up --build

Services:
- Web: http://localhost:5173
- API: http://localhost:3000
- PostgreSQL: localhost:5432
