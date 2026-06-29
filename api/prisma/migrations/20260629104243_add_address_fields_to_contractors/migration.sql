-- AlterTable
ALTER TABLE "contractors" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postal_code" VARCHAR(20),
ADD COLUMN     "street" VARCHAR(255);
