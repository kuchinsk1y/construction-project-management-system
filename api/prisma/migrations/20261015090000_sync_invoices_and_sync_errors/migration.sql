-- Brings migrations in line with schema.prisma (these changes were previously applied only via `prisma db push`).
-- Written idempotently so it is safe on databases that already have them.

-- AlterTable
ALTER TABLE "milestones_invoices" ADD COLUMN IF NOT EXISTS "link" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) NOT NULL DEFAULT 'OCZEKUJE',
ALTER COLUMN "invoice_number" DROP NOT NULL,
ALTER COLUMN "issued_date" DROP NOT NULL,
ALTER COLUMN "paid_at" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "google_sheets_sync_errors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "payload" TEXT,
    "error_message" TEXT NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheets_sync_errors_pkey" PRIMARY KEY ("id")
);
