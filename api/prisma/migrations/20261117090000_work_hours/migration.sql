-- Work log of the brigade app (empty until saving the day form is built) and its surcharges, many-to-many like user_roles.
-- The surcharge rate is kept per entry, so later changes in ERP do not change old entries.
-- CreateTable
CREATE TABLE "work_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "work_date" DATE NOT NULL,
    "project_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "manager_id" INTEGER,
    "manager_name" VARCHAR(255),
    "worker_id" BIGINT NOT NULL,
    "worker_name" VARCHAR(255) NOT NULL,
    "worker_company_name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255) NOT NULL DEFAULT '',
    "work_day_event_id" UUID NOT NULL,
    "hours" INTEGER NOT NULL,
    "note" VARCHAR(2000) NOT NULL DEFAULT '',

    CONSTRAINT "work_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_hour_surcharges" (
    "work_hour_id" UUID NOT NULL,
    "surcharge_id" UUID NOT NULL,
    "rate_per_hour" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "work_hour_surcharges_pkey" PRIMARY KEY ("work_hour_id","surcharge_id")
);

-- CreateIndex
CREATE INDEX "work_hours_work_date_manager_id_idx" ON "work_hours"("work_date", "manager_id");

-- CreateIndex
CREATE INDEX "work_hours_worker_id_work_date_idx" ON "work_hours"("worker_id", "work_date");

-- CreateIndex
CREATE INDEX "work_hours_project_id_work_date_idx" ON "work_hours"("project_id", "work_date");

-- CreateIndex
CREATE INDEX "work_hours_work_type_id_idx" ON "work_hours"("work_type_id");

-- CreateIndex
CREATE INDEX "work_hours_work_day_event_id_idx" ON "work_hours"("work_day_event_id");

-- CreateIndex
CREATE INDEX "work_hour_surcharges_surcharge_id_idx" ON "work_hour_surcharges"("surcharge_id");

-- AddForeignKey
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "project_work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_hour_surcharges" ADD CONSTRAINT "work_hour_surcharges_work_hour_id_fkey" FOREIGN KEY ("work_hour_id") REFERENCES "work_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_hour_surcharges" ADD CONSTRAINT "work_hour_surcharges_surcharge_id_fkey" FOREIGN KEY ("surcharge_id") REFERENCES "surcharges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


COMMENT ON COLUMN "work_hours"."work_day_event_id" IS 'TMA work day event (QR check-in) the hours come from';
