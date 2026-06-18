CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- contractors
CREATE TABLE "contractors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "tax_number" VARCHAR(100),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- align users with contractor relation from drawSQL
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "contractor_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_contractor_id_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_contractor_id_fkey"
    FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- roles and user_roles
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_code_key" UNIQUE ("code")
);

CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" BIGINT NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

-- dictionaries
CREATE TABLE "project_types" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_types_code_key" UNIQUE ("code")
);

CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "departments_name_key" UNIQUE ("name")
);

CREATE TABLE "currencies" (
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(50),
    "symbol" VARCHAR(10),
    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "cost_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_salary" BOOLEAN,
    CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id")
);

-- projects core
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractor_id" UUID NOT NULL,
    "project_type_id" BIGINT NOT NULL,
    "manager_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10, 7),
    "longitude" DECIMAL(10, 7),
    "start_date_contract" DATE,
    "end_date_contract" DATE,
    "start_date_fact" DATE,
    "end_date_fact" DATE,
    "contract_net_value" DECIMAL(18, 2),
    "currency" CHAR(3),
    "vat_rate" DECIMAL(5, 2),
    "payment_term_days" INTEGER,
    "warranty_percent" DECIMAL(5, 2),
    "warranty_months" INTEGER,
    "status" VARCHAR(100) NOT NULL DEFAULT 'DRAFT',
    "hold_reason" TEXT,
    "hold_started_at" TIMESTAMPTZ(0),
    "expected_resume_date" DATE,
    "google_drive_folder_id" VARCHAR(100),
    "deleted_at" TIMESTAMPTZ(0),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_no" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "percentage" DECIMAL(5, 2),
    "net_amount" DECIMAL(15, 2),
    "invoicing_percentage" DECIMAL(5, 2),
    "deleted_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_work_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(20),
    "total_quantity" DECIMAL(15, 2),
    "planned_start" DATE,
    "planned_end" DATE,
    "deleted_at" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_work_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_department_foremen" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "foreman_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_department_foremen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_budget_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "cost_category_id" BIGINT NOT NULL,
    "planned_amount" DECIMAL(15, 2),
    CONSTRAINT "project_budget_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_hours_plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "average_hourly_rate" DECIMAL(15, 2),
    "planned_hours_total" DECIMAL(15, 2),
    CONSTRAINT "project_hours_plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_hours_plan_project_id_key" UNIQUE ("project_id")
);

CREATE TABLE "work_type_hours_distribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "percentage" DECIMAL(5, 2),
    CONSTRAINT "work_type_hours_distribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_type_id" UUID NOT NULL,
    "planned_workers" INTEGER,
    "date_from" DATE,
    "date_to" DATE,
    CONSTRAINT "resource_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_date" DATE NOT NULL,
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "actual_workers" INTEGER,
    "actual_hours" DECIMAL(10, 2),
    "actual_quantity" DECIMAL(18, 2),
    "deleted_at" TIMESTAMPTZ(0),
    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planned_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "cost_category_id" BIGINT NOT NULL,
    "planned_percent" DECIMAL(5, 2),
    "planned_date" DATE,
    CONSTRAINT "planned_expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "milestones_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestone_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "net_value" DECIMAL(8, 2) NOT NULL,
    "note" TEXT NOT NULL,
    "issued_date" DATE NOT NULL,
    "paid_at" DATE NOT NULL,
    CONSTRAINT "milestones_invoices_pkey" PRIMARY KEY ("id")
);

-- foreign keys
ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_currency_fkey" FOREIGN KEY ("currency") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_status_history"
ADD CONSTRAINT "project_status_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_status_history"
ADD CONSTRAINT "project_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "milestones"
ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_work_types"
ADD CONSTRAINT "project_work_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_work_types"
ADD CONSTRAINT "project_work_types_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_work_types"
ADD CONSTRAINT "project_work_types_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_department_foremen"
ADD CONSTRAINT "project_department_foremen_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_department_foremen"
ADD CONSTRAINT "project_department_foremen_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_department_foremen"
ADD CONSTRAINT "project_department_foremen_foreman_id_fkey" FOREIGN KEY ("foreman_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_budget_items"
ADD CONSTRAINT "project_budget_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_budget_items"
ADD CONSTRAINT "project_budget_items_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_hours_plan"
ADD CONSTRAINT "project_hours_plan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_type_hours_distribution"
ADD CONSTRAINT "work_type_hours_distribution_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_type_hours_distribution"
ADD CONSTRAINT "work_type_hours_distribution_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_plans"
ADD CONSTRAINT "resource_plans_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_reports"
ADD CONSTRAINT "daily_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_reports"
ADD CONSTRAINT "daily_reports_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planned_expenses"
ADD CONSTRAINT "planned_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planned_expenses"
ADD CONSTRAINT "planned_expenses_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "milestones_invoices"
ADD CONSTRAINT "milestones_invoices_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
