-- project_locations held a copy of the project coordinates; it is replaced by named gathering points
-- (the site location stays in projects.pin_url / latitude / longitude).
-- DropForeignKey
ALTER TABLE "project_locations" DROP CONSTRAINT "project_locations_project_id_fkey";

-- DropTable
DROP TABLE "project_locations";

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

-- CreateIndex
CREATE INDEX "project_gathering_points_project_id_idx" ON "project_gathering_points"("project_id");

-- AddForeignKey
ALTER TABLE "project_gathering_points" ADD CONSTRAINT "project_gathering_points_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

