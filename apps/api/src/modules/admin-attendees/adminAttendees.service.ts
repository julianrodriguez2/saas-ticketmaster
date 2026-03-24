import { prisma, type Prisma } from "@ticketing/db";
import { z } from "zod";
import { buildPaginationMeta, toSkipTake } from "../../utils/pagination";
import { parsePaginationQuery } from "../../utils/queryParsers";

const attendeeQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["ACTIVE", "USED", "CANCELLED"]).optional()
});

const attendeeSortColumns = ["issuedAt", "status", "checkInStatus"] as const;

export class AdminAttendeesServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function listEventAttendees(
  eventId: string,
  query: unknown
): Promise<{
  event: {
    id: string;
    title: string;
  };
  attendees: Array<{
    ticketId: string;
    attendeeName: string | null;
    customerEmail: string | null;
    ticketCode: string;
    ticketStatus: "ACTIVE" | "USED" | "CANCELLED";
    checkInStatus: "NOT_CHECKED_IN" | "CHECKED_IN";
    checkedInAt: Date | null;
    seat: {
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
    tier: {
      id: string;
      name: string;
    } | null;
    orderId: string;
    orderStatus: "PENDING" | "PAID" | "FAILED";
    purchaseDate: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { filters, page, limit, sortBy, sortOrder } = parseAttendeeQuery(query);
  const event = await getEventOrThrow(eventId);
  const where = buildAttendeeWhere(eventId, filters);
  const { skip, take } = toSkipTake({ page, limit });

  const [total, tickets] = await prisma.$transaction([
    prisma.ticket.count({
      where
    }),
    prisma.ticket.findMany({
      where,
      orderBy: buildAttendeeSort(sortBy, sortOrder),
      skip,
      take,
      select: {
        id: true,
        attendeeName: true,
        code: true,
        status: true,
        checkInStatus: true,
        checkedInAt: true,
        orderId: true,
        order: {
          select: {
            status: true,
            createdAt: true,
            email: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
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
    })
  ]);

  return {
    event,
    attendees: tickets.map((ticket) => ({
      ticketId: ticket.id,
      attendeeName: ticket.attendeeName,
      customerEmail: ticket.order.email ?? ticket.order.user?.email ?? null,
      ticketCode: ticket.code,
      ticketStatus: ticket.status,
      checkInStatus: ticket.checkInStatus,
      checkedInAt: ticket.checkedInAt,
      seat: ticket.seat
        ? {
            section: ticket.seat.row.section.name,
            row: ticket.seat.row.label,
            seatNumber: ticket.seat.seatNumber,
            label: ticket.seat.label
          }
        : null,
      tier: ticket.ticketTier,
      orderId: ticket.orderId,
      orderStatus: ticket.order.status,
      purchaseDate: ticket.order.createdAt
    })),
    pagination: buildPaginationMeta({
      page,
      limit,
      total
    })
  };
}

export async function exportEventAttendeesCsv(
  eventId: string,
  query: unknown
): Promise<{
  filename: string;
  csv: string;
}> {
  const { filters } = parseAttendeeQuery(query);
  const event = await getEventOrThrow(eventId);
  const where = buildAttendeeWhere(eventId, filters);
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: {
      issuedAt: "desc"
    },
    select: {
      attendeeName: true,
      code: true,
      status: true,
      orderId: true,
      order: {
        select: {
          createdAt: true,
          email: true,
          user: {
            select: {
              email: true
            }
          }
        }
      },
      seat: {
        select: {
          seatNumber: true,
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
          name: true
        }
      }
    }
  });

  const header = [
    "event title",
    "customer email",
    "attendee name",
    "ticket code",
    "ticket status",
    "section",
    "row",
    "seat",
    "tier",
    "order id",
    "purchase date"
  ];

  const rows = tickets.map((ticket) => [
    event.title,
    ticket.order.email ?? ticket.order.user?.email ?? "",
    ticket.attendeeName ?? "",
    ticket.code,
    ticket.status,
    ticket.seat?.row.section.name ?? "",
    ticket.seat?.row.label ?? "",
    ticket.seat?.seatNumber ?? "",
    ticket.ticketTier?.name ?? "",
    ticket.orderId,
    ticket.order.createdAt.toISOString()
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => toCsvCell(value)).join(","))
    .join("\n");

  return {
    filename: `${slugify(event.title)}-attendees.csv`,
    csv
  };
}

function buildAttendeeWhere(
  eventId: string,
  filters: {
    search?: string;
    status?: "ACTIVE" | "USED" | "CANCELLED";
  }
): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {
    eventId
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        attendeeName: {
          contains: filters.search,
          mode: "insensitive"
        }
      },
      {
        code: {
          contains: filters.search,
          mode: "insensitive"
        }
      },
      {
        order: {
          email: {
            contains: filters.search,
            mode: "insensitive"
          }
        }
      },
      {
        order: {
          user: {
            email: {
              contains: filters.search,
              mode: "insensitive"
            }
          }
        }
      }
    ];
  }

  return where;
}

function parseAttendeeQuery(query: unknown): {
  filters: {
    search?: string;
    status?: "ACTIVE" | "USED" | "CANCELLED";
  };
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
} {
  const parsedQuery = attendeeQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new AdminAttendeesServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid attendee query."
    );
  }

  const pagination = parsePaginationQuery(query, {
    defaultLimit: 50,
    maxLimit: 200,
    defaultSortBy: "issuedAt",
    defaultSortOrder: "desc",
    allowedSortBy: [...attendeeSortColumns]
  });

  const { search, status } = parsedQuery.data;

  return {
    filters: {
      search,
      status
    },
    page: pagination.page,
    limit: pagination.limit,
    sortBy: pagination.sortBy,
    sortOrder: pagination.sortOrder
  };
}

async function getEventOrThrow(eventId: string): Promise<{
  id: string;
  title: string;
}> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true,
      title: true
    }
  });

  if (!event) {
    throw new AdminAttendeesServiceError(404, "Event not found.");
  }

  return event;
}

function toCsvCell(value: string): string {
  const escapedValue = value.replace(/"/g, "\"\"");
  return `"${escapedValue}"`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function buildAttendeeSort(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc"
): Prisma.TicketOrderByWithRelationInput {
  if (!sortBy || !attendeeSortColumns.includes(sortBy as (typeof attendeeSortColumns)[number])) {
    return { issuedAt: "desc" };
  }

  return {
    [sortBy]: sortOrder
  } as Prisma.TicketOrderByWithRelationInput;
}
