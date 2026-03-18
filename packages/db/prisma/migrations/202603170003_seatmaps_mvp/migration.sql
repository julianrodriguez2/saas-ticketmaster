-- CreateEnum
CREATE TYPE "TicketingMode" AS ENUM ('GA', 'RESERVED');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "ticketingMode" "TicketingMode" NOT NULL DEFAULT 'GA';

-- CreateTable
CREATE TABLE "SeatSection" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SeatSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatRow" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,

  CONSTRAINT "SeatRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
  "id" TEXT NOT NULL,
  "rowId" TEXT NOT NULL,
  "seatNumber" TEXT NOT NULL,
  "label" TEXT,
  "x" INTEGER NOT NULL,
  "y" INTEGER NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',

  CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seat_rowId_seatNumber_key" ON "Seat"("rowId", "seatNumber");

-- AddForeignKey
ALTER TABLE "SeatSection" ADD CONSTRAINT "SeatSection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatRow" ADD CONSTRAINT "SeatRow_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SeatSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "SeatRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
