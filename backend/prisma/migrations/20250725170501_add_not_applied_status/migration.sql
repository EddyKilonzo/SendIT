-- AlterEnum
ALTER TYPE "DriverApplicationStatus" ADD VALUE 'NOT_APPLIED';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "driverApplicationStatus" SET DEFAULT 'NOT_APPLIED';
