import { prisma, type NotificationSeverity } from "@ticketing/db";
import { z } from "zod";

const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export class AdminNotificationServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type CreateAdminNotificationInput = {
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedOrderId?: string;
  relatedEventId?: string;
  relatedTicketId?: string;
  dedupeKey?: string;
};

export async function createAdminNotification(
  input: CreateAdminNotificationInput
): Promise<void> {
  const dedupeKey = input.dedupeKey?.trim();

  if (dedupeKey) {
    const duplicateWindowStart = new Date(Date.now() - 15 * 60 * 1000);
    const existingNotification = await prisma.adminNotification.findFirst({
      where: {
        dedupeKey,
        createdAt: {
          gte: duplicateWindowStart
        }
      },
      select: {
        id: true
      }
    });

    if (existingNotification) {
      return;
    }
  }

  await prisma.adminNotification.create({
    data: {
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      relatedOrderId: input.relatedOrderId,
      relatedEventId: input.relatedEventId,
      relatedTicketId: input.relatedTicketId,
      dedupeKey
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[admin-notification:${input.severity}] ${input.title} - ${input.message}`
    );
  }
}

export async function createAdminNotificationSafe(
  input: CreateAdminNotificationInput
): Promise<void> {
  try {
    await createAdminNotification(input);
  } catch (error) {
    console.error("Failed to create admin notification.", error);
  }
}

export async function listAdminNotifications(query: unknown): Promise<{
  notifications: Array<{
    id: string;
    type: string;
    severity: NotificationSeverity;
    title: string;
    message: string;
    relatedOrderId: string | null;
    relatedEventId: string | null;
    relatedTicketId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
}> {
  const parsedQuery = listNotificationsQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new AdminNotificationServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid notification query."
    );
  }

  const unreadOnly =
    parsedQuery.data.unreadOnly === true || parsedQuery.data.unreadOnly === "true";

  const notifications = await prisma.adminNotification.findMany({
    where: {
      ...(unreadOnly ? { readAt: null } : {}),
      ...(parsedQuery.data.severity ? { severity: parsedQuery.data.severity } : {}),
      ...(parsedQuery.data.type ? { type: parsedQuery.data.type } : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: parsedQuery.data.limit,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      message: true,
      relatedOrderId: true,
      relatedEventId: true,
      relatedTicketId: true,
      readAt: true,
      createdAt: true
    }
  });

  return {
    notifications
  };
}

export async function markAdminNotificationRead(
  notificationId: string
): Promise<{
  id: string;
  readAt: Date | null;
}> {
  const existingNotification = await prisma.adminNotification.findUnique({
    where: {
      id: notificationId
    },
    select: {
      id: true
    }
  });

  if (!existingNotification) {
    throw new AdminNotificationServiceError(404, "Notification not found.");
  }

  return prisma.adminNotification.update({
    where: {
      id: notificationId
    },
    data: {
      readAt: new Date()
    },
    select: {
      id: true,
      readAt: true
    }
  });
}

export async function markAllAdminNotificationsRead(): Promise<{
  count: number;
}> {
  const result = await prisma.adminNotification.updateMany({
    where: {
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return {
    count: result.count
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  return prisma.adminNotification.count({
    where: {
      readAt: null
    }
  });
}
