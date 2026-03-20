import { prisma, type Prisma, type RiskLevel } from "@ticketing/db";
import { z } from "zod";

const listAdminOrdersQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const listFlaggedOrdersQuerySchema = listAdminOrdersQuerySchema.extend({
  riskLevel: z.enum(["MEDIUM", "HIGH"]).optional()
});

const reviewAdminOrderSchema = z.object({
  reviewNotes: z.string().trim().max(1000).optional()
});

export class AdminOrdersServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function listAdminOrders(query: unknown): Promise<{
  orders: Array<{
    id: string;
    customerEmail: string | null;
    event: {
      id: string;
      title: string;
      date: Date;
    };
    totalAmount: number;
    status: "PENDING" | "PAID" | "FAILED";
    createdAt: Date;
    ticketCount: number;
    riskLevel: RiskLevel;
    fraudFlags: string[];
    flaggedAt: Date | null;
    reviewedAt: Date | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { filters, page, limit } = parseAdminOrdersQuery(query);
  const where = buildAdminOrdersWhere(filters);

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        riskLevel: true,
        fraudFlags: true,
        flaggedAt: true,
        reviewedAt: true,
        event: {
          select: {
            id: true,
            title: true,
            date: true
          }
        },
        user: {
          select: {
            email: true
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    })
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      customerEmail: order.email ?? order.user?.email ?? null,
      event: order.event,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
      ticketCount: order._count.tickets,
      riskLevel: order.riskLevel,
      fraudFlags: parseFraudFlags(order.fraudFlags),
      flaggedAt: order.flaggedAt,
      reviewedAt: order.reviewedAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    }
  };
}

export async function listFlaggedAdminOrders(query: unknown): Promise<{
  orders: Array<{
    id: string;
    customerEmail: string | null;
    event: {
      id: string;
      title: string;
      date: Date;
    };
    totalAmount: number;
    status: "PENDING" | "PAID" | "FAILED";
    createdAt: Date;
    ticketCount: number;
    riskLevel: RiskLevel;
    fraudFlags: string[];
    flaggedAt: Date | null;
    reviewedAt: Date | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const parsedQuery = listFlaggedOrdersQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new AdminOrdersServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid flagged orders query."
    );
  }

  const { riskLevel, page, limit, ...filters } = parsedQuery.data;
  const where = buildAdminOrdersWhere(filters);
  where.riskLevel = riskLevel ? riskLevel : { in: ["MEDIUM", "HIGH"] };

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [
        {
          flaggedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        riskLevel: true,
        fraudFlags: true,
        flaggedAt: true,
        reviewedAt: true,
        event: {
          select: {
            id: true,
            title: true,
            date: true
          }
        },
        user: {
          select: {
            email: true
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    })
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      customerEmail: order.email ?? order.user?.email ?? null,
      event: order.event,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
      ticketCount: order._count.tickets,
      riskLevel: order.riskLevel,
      fraudFlags: parseFraudFlags(order.fraudFlags),
      flaggedAt: order.flaggedAt,
      reviewedAt: order.reviewedAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    }
  };
}

export async function exportAdminOrdersCsv(query: unknown): Promise<{
  filename: string;
  csv: string;
}> {
  const { filters } = parseAdminOrdersQuery(query);
  const where = buildAdminOrdersWhere(filters);
  const orders = await prisma.order.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      email: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      riskLevel: true,
      fraudFlags: true,
      event: {
        select: {
          title: true,
          date: true
        }
      },
      user: {
        select: {
          email: true
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });

  const header = [
    "order id",
    "customer email",
    "event title",
    "event date",
    "total amount",
    "status",
    "risk level",
    "fraud flags",
    "ticket count",
    "created at"
  ];

  const rows = orders.map((order) => [
    order.id,
    order.email ?? order.user?.email ?? "",
    order.event.title,
    order.event.date.toISOString(),
    Number(order.totalAmount).toFixed(2),
    order.status,
    order.riskLevel,
    parseFraudFlags(order.fraudFlags).join("|"),
    String(order._count.tickets),
    order.createdAt.toISOString()
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => toCsvCell(value)).join(","))
    .join("\n");

  return {
    filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
    csv
  };
}

export async function getAdminOrderById(orderId: string): Promise<{
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  totalAmount: number;
  createdAt: Date;
  email: string | null;
  riskLevel: RiskLevel;
  fraudFlags: string[];
  flaggedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  customer: {
    userId: string | null;
    email: string | null;
  };
  review: {
    reviewedAt: Date | null;
    reviewNotes: string | null;
    reviewedBy: {
      id: string;
      email: string;
    } | null;
  };
  event: {
    id: string;
    title: string;
    date: Date;
    venue: {
      name: string;
      location: string;
    };
  };
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
    amount: number;
    providerResponseCode: string | null;
    failureReason: string | null;
    createdAt: Date;
  } | null;
  paymentAttempts: Array<{
    id: string;
    status: "STARTED" | "FAILED" | "SUCCEEDED" | "BLOCKED";
    reason: string | null;
    email: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    message: string;
    readAt: Date | null;
    createdAt: Date;
  }>;
  tickets: Array<{
    id: string;
    code: string;
    status: "ACTIVE" | "USED" | "CANCELLED";
    checkInStatus: "NOT_CHECKED_IN" | "CHECKED_IN";
    checkedInAt: Date | null;
    attendeeName: string | null;
    seat: {
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
    ticketTier: {
      id: string;
      name: string;
    } | null;
  }>;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    seat: {
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
    ticketTier: {
      id: string;
      name: string;
    } | null;
  }>;
}> {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      },
      reviewedBy: {
        select: {
          id: true,
          email: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          venue: {
            select: {
              name: true,
              location: true
            }
          }
        }
      },
      payment: {
        select: {
          provider: true,
          status: true,
          paymentIntentId: true,
          amount: true,
          providerResponseCode: true,
          failureReason: true,
          createdAt: true
        }
      },
      notifications: {
        orderBy: {
          createdAt: "desc"
        },
        take: 10,
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          readAt: true,
          createdAt: true
        }
      },
      tickets: {
        orderBy: {
          issuedAt: "asc"
        },
        select: {
          id: true,
          code: true,
          status: true,
          checkInStatus: true,
          checkedInAt: true,
          attendeeName: true,
          seat: {
            select: {
              seatNumber: true,
              label: true,
              row: {
                select: {
                  label: true,
                  section: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          ticketTier: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      items: {
        orderBy: {
          id: "asc"
        },
        select: {
          id: true,
          quantity: true,
          price: true,
          seat: {
            select: {
              seatNumber: true,
              label: true,
              row: {
                select: {
                  label: true,
                  section: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          ticketTier: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new AdminOrdersServiceError(404, "Order not found.");
  }

  const customerEmail = order.email ?? order.user?.email ?? null;
  const paymentAttempts = await getPaymentAttemptsForOrder({
    eventId: order.event.id,
    email: customerEmail,
    ipAddress: order.ipAddress
  });

  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    email: order.email,
    riskLevel: order.riskLevel,
    fraudFlags: parseFraudFlags(order.fraudFlags),
    flaggedAt: order.flaggedAt,
    ipAddress: order.ipAddress,
    userAgent: order.userAgent,
    customer: {
      userId: order.user?.id ?? null,
      email: customerEmail
    },
    review: {
      reviewedAt: order.reviewedAt,
      reviewNotes: order.reviewNotes,
      reviewedBy: order.reviewedBy
        ? {
            id: order.reviewedBy.id,
            email: order.reviewedBy.email
          }
        : null
    },
    event: order.event,
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          paymentIntentId: order.payment.paymentIntentId,
          amount: Number(order.payment.amount),
          providerResponseCode: order.payment.providerResponseCode,
          failureReason: order.payment.failureReason,
          createdAt: order.payment.createdAt
        }
      : null,
    paymentAttempts,
    notifications: order.notifications,
    tickets: order.tickets.map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      checkInStatus: ticket.checkInStatus,
      checkedInAt: ticket.checkedInAt,
      attendeeName: ticket.attendeeName,
      seat: ticket.seat
        ? {
            section: ticket.seat.row.section.name,
            row: ticket.seat.row.label,
            seatNumber: ticket.seat.seatNumber,
            label: ticket.seat.label
          }
        : null,
      ticketTier: ticket.ticketTier
    })),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: Number(item.price),
      seat: item.seat
        ? {
            section: item.seat.row.section.name,
            row: item.seat.row.label,
            seatNumber: item.seat.seatNumber,
            label: item.seat.label
          }
        : null,
      ticketTier: item.ticketTier
    }))
  };
}

export async function reviewAdminOrder(
  orderId: string,
  reviewerUserId: string,
  input: unknown
): Promise<{
  id: string;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  reviewedByUserId: string | null;
}> {
  const parsedPayload = reviewAdminOrderSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new AdminOrdersServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid review payload."
    );
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      id: true
    }
  });

  if (!order) {
    throw new AdminOrdersServiceError(404, "Order not found.");
  }

  return prisma.order.update({
    where: {
      id: orderId
    },
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
      reviewNotes: parsedPayload.data.reviewNotes || null
    },
    select: {
      id: true,
      reviewedAt: true,
      reviewNotes: true,
      reviewedByUserId: true
    }
  });
}

export async function getFlaggedAdminOrderCount(): Promise<number> {
  return prisma.order.count({
    where: {
      riskLevel: {
        in: ["MEDIUM", "HIGH"]
      }
    }
  });
}

function parseAdminOrdersQuery(query: unknown): {
  filters: {
    eventId?: string;
    status?: "PENDING" | "PAID" | "FAILED";
    search?: string;
  };
  page: number;
  limit: number;
} {
  const parsedQuery = listAdminOrdersQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new AdminOrdersServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid admin orders query."
    );
  }

  const { eventId, status, search, page, limit } = parsedQuery.data;

  return {
    filters: {
      eventId,
      status,
      search
    },
    page,
    limit
  };
}

function buildAdminOrdersWhere(filters: {
  eventId?: string;
  status?: "PENDING" | "PAID" | "FAILED";
  search?: string;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.eventId) {
    where.eventId = filters.eventId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        id: {
          contains: filters.search,
          mode: "insensitive"
        }
      },
      {
        email: {
          contains: filters.search,
          mode: "insensitive"
        }
      },
      {
        user: {
          email: {
            contains: filters.search,
            mode: "insensitive"
          }
        }
      }
    ];
  }

  return where;
}

async function getPaymentAttemptsForOrder(input: {
  eventId: string;
  email: string | null;
  ipAddress: string | null;
}): Promise<
  Array<{
    id: string;
    status: "STARTED" | "FAILED" | "SUCCEEDED" | "BLOCKED";
    reason: string | null;
    email: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>
> {
  const identifiers: Prisma.PaymentAttemptWhereInput[] = [];

  if (input.email) {
    identifiers.push({ email: input.email });
  }

  if (input.ipAddress) {
    identifiers.push({ ipAddress: input.ipAddress });
  }

  if (identifiers.length === 0) {
    return [];
  }

  return prisma.paymentAttempt.findMany({
    where: {
      eventId: input.eventId,
      OR: identifiers
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20,
    select: {
      id: true,
      status: true,
      reason: true,
      email: true,
      ipAddress: true,
      createdAt: true
    }
  });
}

function parseFraudFlags(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toCsvCell(value: string): string {
  const escapedValue = value.replace(/"/g, "\"\"");
  return `"${escapedValue}"`;
}
