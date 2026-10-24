-- Site location of a project, kept in sync with projects.latitude/longitude; gathering point filled later
-- CreateTable
CREATE TABLE "project_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "gathering_point_latitude" DECIMAL(10,7),
    "gathering_point_longitude" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_locations_project_id_key" ON "project_locations"("project_id");

-- AddForeignKey
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing projects that already have coordinates
INSERT INTO "project_locations" ("project_id", "latitude", "longitude")
SELECT "id", "latitude", "longitude"
FROM "projects"
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
ON CONFLICT ("project_id") DO NOTHING;
