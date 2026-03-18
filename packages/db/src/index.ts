import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Reuse a single PrismaClient in development to avoid connection churn.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type {
  Event,
  Prisma,
  Role,
  Seat,
  SeatRow,
  SeatSection,
  SeatStatus,
  TicketTier,
  TicketingMode,
  User,
  Venue
} from "@prisma/client";
