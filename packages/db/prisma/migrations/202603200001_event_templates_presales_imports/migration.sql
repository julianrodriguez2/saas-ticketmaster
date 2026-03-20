-- CreateEnum
CREATE TYPE "PresaleAccessType" AS ENUM ('PUBLIC', 'CODE', 'LINK_ONLY');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BulkImportJobStatus" AS ENUM ('PENDING', 'VALIDATED', 'COMPLETED', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN "salesStartAt" TIMESTAMP(3),
ADD COLUMN "salesEndAt" TIMESTAMP(3),
ADD COLUMN "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "EventTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "venueId" TEXT,
  "ticketingMode" "TicketingMode" NOT NULL DEFAULT 'GA',
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTicketTier" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,

  CONSTRAINT "TemplateTicketTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePresaleRule" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAtOffsetHours" INTEGER,
  "endsAtOffsetHours" INTEGER,
  "accessType" "PresaleAccessType" NOT NULL,
  "accessCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "TemplatePresaleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresaleRule" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "accessType" "PresaleAccessType" NOT NULL,
  "accessCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PresaleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportJob" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" "BulkImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "summaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportRowError" (
  "id" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "fieldName" TEXT,
  "message" TEXT NOT NULL,
  "rawRowJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BulkImportRowError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateTicketTier_templateId_idx" ON "TemplateTicketTier"("templateId");

-- CreateIndex
CREATE INDEX "TemplatePresaleRule_templateId_idx" ON "TemplatePresaleRule"("templateId");

-- CreateIndex
CREATE INDEX "PresaleRule_eventId_idx" ON "PresaleRule"("eventId");

-- CreateIndex
CREATE INDEX "PresaleRule_isActive_idx" ON "PresaleRule"("isActive");

-- CreateIndex
CREATE INDEX "PresaleRule_startsAt_endsAt_idx" ON "PresaleRule"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdByUserId_idx" ON "BulkImportJob"("createdByUserId");

-- CreateIndex
CREATE INDEX "BulkImportJob_status_idx" ON "BulkImportJob"("status");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "BulkImportRowError_importJobId_idx" ON "BulkImportRowError"("importJobId");

-- CreateIndex
CREATE INDEX "BulkImportRowError_rowNumber_idx" ON "BulkImportRowError"("rowNumber");

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTicketTier" ADD CONSTRAINT "TemplateTicketTier_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePresaleRule" ADD CONSTRAINT "TemplatePresaleRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresaleRule" ADD CONSTRAINT "PresaleRule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportRowError" ADD CONSTRAINT "BulkImportRowError_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "BulkImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
