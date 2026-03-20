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
  AdminNotification,
  BulkImportJob,
  BulkImportJobStatus,
  BulkImportRowError,
  CheckInStatus,
  Event,
  EventTemplate,
  NotificationSeverity,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentProvider,
  PaymentStatus,
  PresaleAccessType,
  PresaleRule,
  Prisma,
  PublishStatus,
  RiskLevel,
  Role,
  Seat,
  SeatRow,
  SeatSection,
  SeatStatus,
  SystemEvent,
  Ticket,
  TicketStatus,
  TicketTier,
  TicketingMode,
  TemplatePresaleRule,
  TemplateTicketTier,
  User,
  Venue
} from "@prisma/client";
