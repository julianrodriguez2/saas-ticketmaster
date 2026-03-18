-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('NOT_CHECKED_IN', 'CHECKED_IN');

-- AlterTable
ALTER TABLE "Ticket"
ADD COLUMN "checkInStatus" "CheckInStatus" NOT NULL DEFAULT 'NOT_CHECKED_IN',
ADD COLUMN "checkedInAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Ticket_checkInStatus_idx" ON "Ticket"("checkInStatus");
