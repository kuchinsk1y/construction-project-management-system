<div align="center">

  # 🏢 Construction Project Management ERP
  
  **A powerful, modern, and scalable monorepo ERP for managing construction projects.**

  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
  [![BullMQ](https://img.shields.io/badge/BullMQ-FF3366?style=for-the-badge)](https://bullmq.io/)
  [![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

  *Streamline your workflow from planning to execution with comprehensive financial tracking, timeline views, and milestone management.*
</div>

---

## 🌟 Overview

The **Construction Project Management ERP** is a full-stack monorepo application designed specifically for the construction and civil engineering sector. It provides an intuitive, high-performance interface for tracking projects, budgets, and milestones in real-time. 

Built with enterprise-grade architecture, the application is split into a robust **NestJS API** backend and a lightning-fast **React/Vite** frontend.

## ✨ Key Features

- **📊 Advanced Project Dashboard:** Visualize all active and completed projects with quick insights into budgets, completion status, and health metrics.
- **📈 Gantt Chart Timeline:** Interactive, drag-and-drop-ready timeline view for project scheduling and resource allocation.
- **🎯 Milestone Tracking (Kamienie Milowe):** Granular tracking of project milestones, including strict percentage validations and budget allocations.
- **🚧 Extra Works Management (Roboty Dodatkowe):** Seamlessly handle out-of-scope work and additional financial claims in a unified form.
- **👥 Contractor & Resource Assignment:** Manage personnel and external contractors directly within the project scope.
- **🌗 Modern UI/UX:** Built with TailwindCSS and `shadcn/ui`, featuring a premium glassmorphic aesthetic, dark mode support, and micro-animations.

---

## 🏗️ Tech Stack

### Backend (`/api`)
- **Framework:** [NestJS](https://nestjs.com/)
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io/)
- **Language:** TypeScript
- **Features:** RESTful Architecture, JWT Authentication, Automated Sync Workers

### Frontend (`/web`)
- **Core:** React 18 + Vite
- **Styling:** Tailwind CSS + `shadcn/ui` (Radix Primitives)
- **State Management:** TanStack Query (React Query)
- **Icons:** Lucide React

---

## 🚀 Getting Started

You can run the application either locally on your host machine or via Docker containers.

### Option A: Local Development (Without Docker)

<details>
<summary><b>1. Start the Backend API</b></summary>
<br/>

```bash
cd api
cp .env.example .env
npm install
npx prisma generate
npm run start:dev
```
</details>

<details>
<summary><b>2. Start the Frontend Web App</b></summary>
<br/>

```bash
cd web
cp .env.example .env
npm install
npm run dev
```
</details>

<br/>

### Option B: Run with Docker Compose 🐳

The easiest way to spin up the entire stack, including the PostgreSQL database, API, and frontend.

```bash
# From the repository root:
cp .env.example .env

# Build and start all containers
docker compose up --build
```

#### Available Services:
- **Web (Frontend):** `http://localhost:5173` (or as configured in Vite)
- **API (Backend):** `http://localhost:3000` (or as configured in NestJS)
- **Database:** PostgreSQL on port `5432`

---

<!-- ## 📸 Screenshots

> **Note:** Add visual previews here to showcase the premium UI elements such as the Gantt View and Project Editor.
> 
> *Example:* `![Dashboard Preview](./docs/dashboard.png)`

---

<div align="center">
  <p>Built with ❤️ for Modern Construction Management.</p>
</div> -->
