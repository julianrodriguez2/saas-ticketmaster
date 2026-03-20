import { prisma, type Prisma } from "@ticketing/db";
import { z } from "zod";

const listAdminOrdersQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
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
      ticketCount: order._count.tickets
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
  customer: {
    userId: string | null;
    email: string | null;
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
    createdAt: Date;
  } | null;
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

  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    email: order.email,
    customer: {
      userId: order.user?.id ?? null,
      email: order.email ?? order.user?.email ?? null
    },
    event: order.event,
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          paymentIntentId: order.payment.paymentIntentId,
          amount: Number(order.payment.amount),
          createdAt: order.payment.createdAt
        }
      : null,
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

function toCsvCell(value: string): string {
  const escapedValue = value.replace(/"/g, "\"\"");
  return `"${escapedValue}"`;
}
