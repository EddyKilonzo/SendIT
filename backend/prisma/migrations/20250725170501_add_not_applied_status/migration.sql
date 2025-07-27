-- AlterEnum
BEGIN;
ALTER TYPE "DriverApplicationStatus" ADD VALUE 'NOT_APPLIED';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "driverApplicationStatus" SET DEFAULT 'NOT_APPLIED';
