-- Hours plan share per work moves from work_type_hours_distribution to a column on the work itself.
-- Unused tables project_budget_items and resource_plans (with the "Zasoby" page) are removed.

-- 1. New column
ALTER TABLE "project_work_types" ADD COLUMN "hours_percentage" DECIMAL(5,2);

-- 2. Copy the saved shares (normally one row per work; if there are several, take the highest)
UPDATE "project_work_types" AS w
SET "hours_percentage" = d."percentage"
FROM (
  SELECT "work_type_id", "project_id", MAX("percentage") AS "percentage"
  FROM "work_type_hours_distribution"
  GROUP BY "work_type_id", "project_id"
) AS d
WHERE d."work_type_id" = w."id" AND d."project_id" = w."project_id";

-- 3. Drop the old tables
ALTER TABLE "work_type_hours_distribution" DROP CONSTRAINT "work_type_hours_distribution_project_id_fkey";
ALTER TABLE "work_type_hours_distribution" DROP CONSTRAINT "work_type_hours_distribution_work_type_id_fkey";
DROP TABLE "work_type_hours_distribution";

ALTER TABLE "project_budget_items" DROP CONSTRAINT "project_budget_items_cost_category_id_fkey";
ALTER TABLE "project_budget_items" DROP CONSTRAINT "project_budget_items_project_id_fkey";
DROP TABLE "project_budget_items";

ALTER TABLE "resource_plans" DROP CONSTRAINT "resource_plans_work_type_id_fkey";
DROP TABLE "resource_plans";
