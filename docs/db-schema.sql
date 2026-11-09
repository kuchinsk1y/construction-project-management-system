-- ERP database schema (PostgreSQL), generated from api/prisma/schema.prisma on 2026-11-02.
-- Matches the database after migration 20261102090000_drop_unused_tables_hours_percentage.
-- For drawSQL import: unique indexes are written as UNIQUE constraints; plain (non-unique) indexes are left out.

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "middle_names" VARCHAR(255),
    "position" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(16) NOT NULL,
    "telegram_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "roles" TEXT[],
    "contractor_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_codes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(100),
    "tax_number" VARCHAR(100),
    "street" VARCHAR(255),
    "postal_code" VARCHAR(20),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_salary" BOOLEAN,

    CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(50),
    "symbol" VARCHAR(10),

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date" DATE NOT NULL,
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "actual_workers" INTEGER,
    "actual_hours" DECIMAL(10,2),
    "actual_quantity" DECIMAL(18,2),
    "deleted_at" TIMESTAMPTZ(0),

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50) NOT NULL DEFAULT 'Folder',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_no" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'KM',
    "percentage" DECIMAL(5,2),
    "net_amount" DECIMAL(15,2),
    "invoicing_percentage" DECIMAL(5,2),
    "deleted_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestone_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100),
    "net_value" DECIMAL(15,2) NOT NULL,
    "note" TEXT NOT NULL,
    "issued_date" DATE,
    "paid_at" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'OCZEKUJE',
    "link" VARCHAR(500),
    "invoice_id" UUID,
    "percent" DECIMAL(5,2),

    CONSTRAINT "milestones_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'OCZEKUJE',
    "issued_date" DATE,
    "paid_at" DATE,
    "link" VARCHAR(500),
    "note" TEXT NOT NULL DEFAULT '',
    "protocol_file_id" VARCHAR(200),
    "protocol_file_name" VARCHAR(255),
    "protocol_mime_type" VARCHAR(150),
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_works" (
    "invoice_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,

    CONSTRAINT "invoice_works_pkey" PRIMARY KEY ("invoice_id","work_type_id")
);

-- CreateTable
CREATE TABLE "planned_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "cost_category_id" BIGINT NOT NULL,
    "planned_percent" DECIMAL(5,2),
    "planned_date" DATE,

    CONSTRAINT "planned_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_departments" (
    "project_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_departments_pkey" PRIMARY KEY ("project_id","department_id")
);

-- CreateTable
CREATE TABLE "project_department_foremen" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "foreman_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_department_foremen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_hours_plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "average_hourly_rate" DECIMAL(15,2),
    "planned_hours_total" DECIMAL(15,2),

    CONSTRAINT "project_hours_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "old_status" VARCHAR(100) NOT NULL,
    "new_status" VARCHAR(100) NOT NULL,
    "reason" TEXT,
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_types" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_work_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "department_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(20),
    "percentage" DECIMAL(5,2),
    "hours_percentage" DECIMAL(5,2),
    "total_quantity" DECIMAL(15,2),
    "planned_start" DATE,
    "planned_end" DATE,
    "deleted_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractor_id" UUID NOT NULL,
    "project_type_id" BIGINT NOT NULL,
    "manager_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "start_date_contract" DATE,
    "end_date_contract" DATE,
    "start_date_fact" DATE,
    "end_date_fact" DATE,
    "contract_net_value" DECIMAL(18,2),
    "currency" CHAR(3),
    "vat_rate" DECIMAL(5,2),
    "payment_term_days" INTEGER,
    "warranty_percent" DECIMAL(5,2),
    "warranty_months" INTEGER,
    "status" VARCHAR(100) NOT NULL DEFAULT 'DRAFT',
    "hold_reason" TEXT,
    "hold_started_at" TIMESTAMPTZ(0),
    "expected_resume_date" DATE,
    "google_drive_folder_id" VARCHAR(100),
    "dokumentation_url" VARCHAR(512),
    "pin_url" VARCHAR(512),
    "deleted_at" TIMESTAMPTZ(0),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "power" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" BIGINT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "google_sheets_sync_errors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "payload" TEXT,
    "error_message" TEXT NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheets_sync_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_gathering_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(0),

    CONSTRAINT "project_gathering_points_pkey" PRIMARY KEY ("id")
);

-- Unique
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE("email");

-- Unique
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_key" UNIQUE("phone_number");

-- Unique
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_key" UNIQUE("token");

-- Unique
ALTER TABLE "departments" ADD CONSTRAINT "departments_name_key" UNIQUE("name");

-- Unique
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_milestone_no_key" UNIQUE("project_id", "milestone_no");

-- Unique
ALTER TABLE "project_hours_plan" ADD CONSTRAINT "project_hours_plan_project_id_key" UNIQUE("project_id");

-- Unique
ALTER TABLE "project_types" ADD CONSTRAINT "project_types_code_key" UNIQUE("code");

-- Unique
ALTER TABLE "roles" ADD CONSTRAINT "roles_code_key" UNIQUE("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones_invoices" ADD CONSTRAINT "milestones_invoices_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones_invoices" ADD CONSTRAINT "milestones_invoices_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_works" ADD CONSTRAINT "invoice_works_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_works" ADD CONSTRAINT "invoice_works_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_department_foremen" ADD CONSTRAINT "project_department_foremen_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_department_foremen" ADD CONSTRAINT "project_department_foremen_foreman_id_fkey" FOREIGN KEY ("foreman_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_department_foremen" ADD CONSTRAINT "project_department_foremen_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_hours_plan" ADD CONSTRAINT "project_hours_plan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_history" ADD CONSTRAINT "project_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_history" ADD CONSTRAINT "project_status_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_work_types" ADD CONSTRAINT "project_work_types_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_work_types" ADD CONSTRAINT "project_work_types_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_work_types" ADD CONSTRAINT "project_work_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_currency_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_gathering_points" ADD CONSTRAINT "project_gathering_points_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
