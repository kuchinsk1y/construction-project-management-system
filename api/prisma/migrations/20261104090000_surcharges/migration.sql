-- Hourly surcharges (dopłaty), managed by an admin; read by the brigade app
-- CreateTable
CREATE TABLE "surcharges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "rate_per_hour" DECIMAL(10,2) NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surcharges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surcharges_is_active_valid_from_idx" ON "surcharges"("is_active", "valid_from");


-- An end date cannot be before the start date
ALTER TABLE "surcharges" ADD CONSTRAINT "surcharges_valid_range" CHECK ("valid_to" IS NULL OR "valid_to" >= "valid_from");
ALTER TABLE "surcharges" ADD CONSTRAINT "surcharges_rate_non_negative" CHECK ("rate_per_hour" >= 0);
