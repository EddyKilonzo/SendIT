/*
  Warnings:

  - A unique constraint covering the columns `[licenseNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'CAR', 'VAN', 'TRUCK');

-- AlterEnum
ALTER TYPE "ParcelStatus" ADD VALUE 'assigned';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "driverId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentLat" DOUBLE PRECISION,
ADD COLUMN     "currentLng" DOUBLE PRECISION,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "vehicleNumber" TEXT,
ADD COLUMN     "vehicleType" "VehicleType";

-- CreateIndex
CREATE UNIQUE INDEX "users_licenseNumber_key" ON "users"("licenseNumber");

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
