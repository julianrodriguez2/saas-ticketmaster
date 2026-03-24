-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "checkoutIdempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutIdempotencyKey_key" ON "Order"("checkoutIdempotencyKey");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Event_publishStatus_idx" ON "Event"("publishStatus");

-- CreateIndex
CREATE INDEX "Event_venueId_date_idx" ON "Event"("venueId", "date");

-- CreateIndex
CREATE INDEX "Seat_status_idx" ON "Seat"("status");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");