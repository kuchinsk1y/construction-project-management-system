CREATE TABLE "users"(
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "contractor_id" UUID NULL,
        "phone_number" VARCHAR(16) NULL,
        "telegram_id" BIGINT NULL
);
ALTER TABLE
    "users" ADD PRIMARY KEY("id");
ALTER TABLE
    "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
CREATE TABLE "roles"(
    "id" bigserial NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL
);
ALTER TABLE
    "roles" ADD PRIMARY KEY("id");
ALTER TABLE
    "roles" ADD CONSTRAINT "roles_code_unique" UNIQUE("code");
CREATE TABLE "user_roles"(
    "user_id" UUID NOT NULL,
    "role_id" BIGINT NOT NULL
);
ALTER TABLE
    "user_roles" ADD PRIMARY KEY("user_id");
ALTER TABLE
    "user_roles" ADD PRIMARY KEY("role_id");
CREATE TABLE "contractors"(
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tax_number" VARCHAR(100) NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "contractors" ADD PRIMARY KEY("id");
CREATE TABLE "project_types"(
    "id" bigserial NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NULL
);
ALTER TABLE
    "project_types" ADD PRIMARY KEY("id");
ALTER TABLE
    "project_types" ADD CONSTRAINT "project_types_code_unique" UNIQUE("code");
CREATE TABLE "departments"(
    "id" bigserial NOT NULL,
    "name" VARCHAR(100) NOT NULL
);
ALTER TABLE
    "departments" ADD PRIMARY KEY("id");
ALTER TABLE
    "departments" ADD CONSTRAINT "departments_name_unique" UNIQUE("name");
CREATE TABLE "currencies"(
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(50) NULL,
    "symbol" VARCHAR(10) NULL
);
ALTER TABLE
    "currencies" ADD PRIMARY KEY("code");
CREATE TABLE "cost_categories"(
    "id" bigserial NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_salary" BOOLEAN NULL
);
ALTER TABLE
    "cost_categories" ADD PRIMARY KEY("id");
CREATE TABLE "projects"(
    "id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "project_type_id" BIGINT NOT NULL,
    "manager_id" UUID NULL,
    "name" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10, 7) NULL,
    "longitude" DECIMAL(10, 7) NULL,
    "start_date_contract" DATE NULL,
    "end_date_contract" DATE NULL,
    "start_date_fact" DATE NULL,
    "end_date_fact" DATE NULL,
    "contract_net_value" DECIMAL(18, 2) NULL,
    "currency" CHAR(3) NULL,
    "vat_rate" DECIMAL(5, 2) NULL,
    "payment_term_days" INTEGER NULL,
    "warranty_percent" DECIMAL(5, 2) NULL,
    "warranty_months" INTEGER NULL,
    "status" VARCHAR(100) NOT NULL DEFAULT 'DRAFT',
    "hold_reason" TEXT NULL,
    "hold_started_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "expected_resume_date" DATE NULL,
        "google_drive_folder_id" VARCHAR(100) NULL,
        "deleted_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "projects" ADD PRIMARY KEY("id");
CREATE TABLE "project_status_history"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "old_status" VARCHAR(100) NOT NULL,
    "new_status" VARCHAR(100) NOT NULL,
    "reason" TEXT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "project_status_history" ADD PRIMARY KEY("id");
CREATE TABLE "milestones"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "milestone_no" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "percentage" DECIMAL(5, 2) NULL,
    "net_amount" DECIMAL(15, 2) NULL,
    "invoicing_percentage" DECIMAL(5, 2) NULL,
    "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "milestones" ADD PRIMARY KEY("id");
CREATE TABLE "project_work_types"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(20) NULL,
    "total_quantity" DECIMAL(15, 2) NULL,
    "planned_start" DATE NULL,
    "planned_end" DATE NULL,
    "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "project_work_types" ADD PRIMARY KEY("id");
CREATE TABLE "project_department_foremen"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "foreman_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "project_department_foremen" ADD PRIMARY KEY("id");
CREATE TABLE "project_budget_items"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "cost_category_id" BIGINT NOT NULL,
    "planned_amount" DECIMAL(15, 2) NULL
);
ALTER TABLE
    "project_budget_items" ADD PRIMARY KEY("id");
CREATE TABLE "project_hours_plan"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "average_hourly_rate" DECIMAL(15, 2) NULL,
    "planned_hours_total" DECIMAL(15, 2) NULL
);
ALTER TABLE
    "project_hours_plan" ADD PRIMARY KEY("id");
ALTER TABLE
    "project_hours_plan" ADD CONSTRAINT "project_hours_plan_project_id_unique" UNIQUE("project_id");
CREATE TABLE "work_type_hours_distribution"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "percentage" DECIMAL(5, 2) NULL
);
ALTER TABLE
    "work_type_hours_distribution" ADD PRIMARY KEY("id");
CREATE TABLE "resource_plans (draft)"(
    "id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "planned_workers" INTEGER NULL,
    "date_from" DATE NULL,
    "date_to" DATE NULL
);
ALTER TABLE
    "resource_plans (draft)" ADD PRIMARY KEY("id");
CREATE TABLE "daily_reports"(
    "id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "actual_workers" INTEGER NULL,
    "actual_hours" DECIMAL(10, 2) NULL,
    "actual_quantity" DECIMAL(18, 2) NULL,
    "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL
);
ALTER TABLE
    "daily_reports" ADD PRIMARY KEY("id");
CREATE TABLE "planned_expenses"(
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "cost_category_id" BIGINT NOT NULL,
    "planned_percent" DECIMAL(5, 2) NULL,
    "planned_date" DATE NULL
);
ALTER TABLE
    "planned_expenses" ADD PRIMARY KEY("id");
CREATE TABLE "milestones_invoices"(
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "net_value" DECIMAL(8, 2) NOT NULL,
    "note" TEXT NOT NULL,
    "issued_date" DATE NOT NULL,
    "paid_at" DATE NOT NULL
);
ALTER TABLE
    "milestones_invoices" ADD PRIMARY KEY("id");
ALTER TABLE
    "user_roles" ADD CONSTRAINT "user_roles_role_id_foreign" FOREIGN KEY("role_id") REFERENCES "roles"("id");
ALTER TABLE
    "planned_expenses" ADD CONSTRAINT "planned_expenses_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "project_work_types" ADD CONSTRAINT "project_work_types_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "project_hours_plan" ADD CONSTRAINT "project_hours_plan_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "projects" ADD CONSTRAINT "projects_currency_foreign" FOREIGN KEY("currency") REFERENCES "currencies"("code");
ALTER TABLE
    "project_department_foremen" ADD CONSTRAINT "project_department_foremen_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "projects" ADD CONSTRAINT "projects_contractor_id_foreign" FOREIGN KEY("contractor_id") REFERENCES "contractors"("id");
ALTER TABLE
    "project_status_history" ADD CONSTRAINT "project_status_history_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "projects" ADD CONSTRAINT "projects_manager_id_foreign" FOREIGN KEY("manager_id") REFERENCES "users"("id");
ALTER TABLE
    "project_budget_items" ADD CONSTRAINT "project_budget_items_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "project_department_foremen" ADD CONSTRAINT "project_department_foremen_department_id_foreign" FOREIGN KEY("department_id") REFERENCES "departments"("id");
ALTER TABLE
    "daily_reports" ADD CONSTRAINT "daily_reports_work_type_id_foreign" FOREIGN KEY("work_type_id") REFERENCES "project_work_types"("id");
ALTER TABLE
    "user_roles" ADD CONSTRAINT "user_roles_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "users"("id");
ALTER TABLE
    "milestones" ADD CONSTRAINT "milestones_id_foreign" FOREIGN KEY("id") REFERENCES "milestones_invoices"("milestone_id");
ALTER TABLE
    "project_work_types" ADD CONSTRAINT "project_work_types_milestone_id_foreign" FOREIGN KEY("milestone_id") REFERENCES "milestones"("id");
ALTER TABLE
    "planned_expenses" ADD CONSTRAINT "planned_expenses_cost_category_id_foreign" FOREIGN KEY("cost_category_id") REFERENCES "cost_categories"("id");
ALTER TABLE
    "projects" ADD CONSTRAINT "projects_project_type_id_foreign" FOREIGN KEY("project_type_id") REFERENCES "project_types"("id");
ALTER TABLE
    "project_department_foremen" ADD CONSTRAINT "project_department_foremen_foreman_id_foreign" FOREIGN KEY("foreman_id") REFERENCES "users"("id");
ALTER TABLE
    "work_type_hours_distribution" ADD CONSTRAINT "work_type_hours_distribution_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "milestones" ADD CONSTRAINT "milestones_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");
ALTER TABLE
    "project_budget_items" ADD CONSTRAINT "project_budget_items_cost_category_id_foreign" FOREIGN KEY("cost_category_id") REFERENCES "cost_categories"("id");
ALTER TABLE
    "project_status_history" ADD CONSTRAINT "project_status_history_changed_by_foreign" FOREIGN KEY("changed_by") REFERENCES "users"("id");
ALTER TABLE
    "work_type_hours_distribution" ADD CONSTRAINT "work_type_hours_distribution_work_type_id_foreign" FOREIGN KEY("work_type_id") REFERENCES "project_work_types"("id");
ALTER TABLE
    "project_work_types" ADD CONSTRAINT "project_work_types_department_id_foreign" FOREIGN KEY("department_id") REFERENCES "departments"("id");
ALTER TABLE
    "daily_reports" ADD CONSTRAINT "daily_reports_project_id_foreign" FOREIGN KEY("project_id") REFERENCES "projects"("id");