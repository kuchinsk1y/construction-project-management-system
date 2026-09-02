-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" VARCHAR(50) NOT NULL DEFAULT 'Folder',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "project_work_types" ADD COLUMN     "percentage" DECIMAL(5,2),
ALTER COLUMN "milestone_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "power" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "project_departments" (
    "project_id" UUID NOT NULL,
    "department_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_departments_pkey" PRIMARY KEY ("project_id","department_id")
);

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_departments" ADD CONSTRAINT "project_departments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
