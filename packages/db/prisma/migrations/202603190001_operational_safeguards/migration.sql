-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('STARTED', 'FAILED', 'SUCCEEDED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN "fraudFlags" JSONB,
ADD COLUMN "flaggedAt" TIMESTAMP(3),
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" TEXT,
ADD COLUMN "reviewNotes" TEXT;

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "providerResponseCode" TEXT,
ADD COLUMN "failureReason" TEXT;

-- CreateTable
CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "ipAddress" TEXT,
  "eventId" TEXT,
  "status" "PaymentAttemptStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" "NotificationSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "relatedOrderId" TEXT,
  "relatedEventId" TEXT,
  "relatedTicketId" TEXT,
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_riskLevel_idx" ON "Order"("riskLevel");

-- CreateIndex
CREATE INDEX "Order_flaggedAt_idx" ON "Order"("flaggedAt");

-- CreateIndex
CREATE INDEX "Order_reviewedAt_idx" ON "Order"("reviewedAt");

-- CreateIndex
CREATE INDEX "Order_reviewedByUserId_idx" ON "Order"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_email_idx" ON "PaymentAttempt"("email");

-- CreateIndex
CREATE INDEX "PaymentAttempt_ipAddress_idx" ON "PaymentAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "PaymentAttempt_eventId_idx" ON "PaymentAttempt"("eventId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_createdAt_idx" ON "PaymentAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_type_idx" ON "AdminNotification"("type");

-- CreateIndex
CREATE INDEX "AdminNotification_severity_idx" ON "AdminNotification"("severity");

-- CreateIndex
CREATE INDEX "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_relatedOrderId_idx" ON "AdminNotification"("relatedOrderId");

-- CreateIndex
CREATE INDEX "AdminNotification_relatedEventId_idx" ON "AdminNotification"("relatedEventId");

-- CreateIndex
CREATE INDEX "AdminNotification_relatedTicketId_idx" ON "AdminNotification"("relatedTicketId");

-- CreateIndex
CREATE INDEX "AdminNotification_dedupeKey_idx" ON "AdminNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "SystemEvent_type_idx" ON "SystemEvent"("type");

-- CreateIndex
CREATE INDEX "SystemEvent_entityType_entityId_idx" ON "SystemEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_relatedTicketId_fkey" FOREIGN KEY ("relatedTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
