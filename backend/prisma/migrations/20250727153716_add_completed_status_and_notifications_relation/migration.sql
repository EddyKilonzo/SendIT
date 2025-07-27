-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PARCEL_COMPLETED';

-- AlterEnum
ALTER TYPE "ParcelStatus" ADD VALUE 'completed';

-- CreateIndex
CREATE INDEX "parcels_senderName_idx" ON "parcels"("senderName");

-- CreateIndex
CREATE INDEX "parcels_senderEmail_idx" ON "parcels"("senderEmail");

-- CreateIndex
CREATE INDEX "parcels_recipientName_idx" ON "parcels"("recipientName");

-- CreateIndex
CREATE INDEX "parcels_recipientEmail_idx" ON "parcels"("recipientEmail");

-- CreateIndex
CREATE INDEX "parcels_senderId_idx" ON "parcels"("senderId");

-- CreateIndex
CREATE INDEX "parcels_recipientId_idx" ON "parcels"("recipientId");

-- CreateIndex
CREATE INDEX "parcels_driverId_idx" ON "parcels"("driverId");

-- CreateIndex
CREATE INDEX "parcels_status_idx" ON "parcels"("status");

-- CreateIndex
CREATE INDEX "parcels_createdAt_idx" ON "parcels"("createdAt");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
