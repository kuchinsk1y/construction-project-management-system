-- Invoices requested by a works acceptance protocol: one invoice can settle several milestones
-- AlterTable
ALTER TABLE "milestones_invoices" ADD COLUMN     "invoice_id" UUID,
ADD COLUMN     "percent" DECIMAL(5,2),
ALTER COLUMN "net_value" SET DATA TYPE DECIMAL(15,2);

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

-- CreateIndex
CREATE INDEX "invoices_project_id_idx" ON "invoices"("project_id");

-- CreateIndex
CREATE INDEX "invoice_works_work_type_id_idx" ON "invoice_works"("work_type_id");

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

