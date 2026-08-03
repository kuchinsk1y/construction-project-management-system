-- Add type column with default 'KM' for existing rows
ALTER TABLE "milestones" ADD COLUMN "type" VARCHAR(30) NOT NULL DEFAULT 'KM';

-- Add unique constraint on (project_id, milestone_no) excluding soft-deleted rows
-- Note: soft-deleted rows have deleted_at IS NOT NULL, so we allow duplicates for them
-- using a partial unique index
CREATE UNIQUE INDEX "milestones_project_id_milestone_no_key"
  ON "milestones"("project_id", "milestone_no")
  WHERE "deleted_at" IS NULL;
