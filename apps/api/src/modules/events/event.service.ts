import { appCache, withCache } from "../../utils/cache";
import { buildPaginationMeta, toSkipTake } from "../../utils/pagination";
import { parsePaginationQuery } from "../../utils/queryParsers";
import { prisma, type Prisma, type TicketingMode } from "@ticketing/db";
import { z } from "zod";

const createEventSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(5000),
    date: z.coerce.date(),
    venueId: z.string().min(1),
    ticketingMode: z.enum(["GA", "RESERVED"]).default("GA"),
    currency: z.string().trim().length(3).default("USD"),
    salesStartAt: z.coerce.date().optional(),
    salesEndAt: z.coerce.date().optional(),
    publishStatus: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
    ticketTiers: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(80),
          price: z.coerce.number().positive(),
          quantity: z.coerce.number().int().positive()
        })
      )
      .default([])
  })
  .superRefine((payload, context) => {
    if (
      payload.salesStartAt &&
      payload.salesEndAt &&
      payload.salesStartAt >= payload.salesEndAt
    ) {
      context.addIssue({
        code: "custom",
        message: "Sales start must be before sales end."
      });
    }
  });

const listEventsQuerySchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  venue: z.string().trim().min(1).max(160).optional(),
  date: z.string().trim().min(1).optional()
});

const eventListSelect = {
  id: true,
  title: true,
  date: true,
  createdAt: true,
  ticketingMode: true,
  currency: true,
  salesStartAt: true,
  salesEndAt: true,
  publishStatus: true,
  venue: {
    select: {
      name: true,
      location: true
    }
  },
  ticketTiers: {
    select: {
      price: true
    },
    orderBy: {
      price: "asc"
    },
    take: 1
  }
} satisfies Prisma.EventSelect;

const eventDetailInclude = {
  venue: true,
  ticketTiers: {
    orderBy: {
      price: "asc"
    }
  },
  presaleRules: {
    orderBy: {
      startsAt: "asc"
    },
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      accessType: true,
      isActive: true
    }
  },
  seatSections: {
    select: {
      id: true
    },
    take: 1
  }
} as const;

const listEventsSortColumns = ["date", "title", "createdAt"] as const;
const eventListTtlMs = parseTtl("EVENT_LIST_CACHE_TTL_MS", 15_000);
const eventDetailTtlMs = parseTtl("EVENT_DETAIL_CACHE_TTL_MS", 20_000);
const eventRecommendedTtlMs = parseTtl("EVENT_RECOMMENDED_CACHE_TTL_MS", 20_000);

export class EventServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createEvent(input: unknown) {
  const parsedPayload = createEventSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new EventServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid event payload."
    );
  }

  const {
    title,
    description,
    date,
    venueId,
    ticketingMode,
    currency,
    salesStartAt,
    salesEndAt,
    publishStatus,
    ticketTiers
  } = parsedPayload.data;

  if (ticketingMode === "GA" && ticketTiers.length === 0) {
    throw new EventServiceError(400, "GA events must include at least one ticket tier.");
  }

  if (ticketingMode === "RESERVED" && ticketTiers.length > 0) {
    throw new EventServiceError(400, "Reserved events cannot include GA ticket tiers.");
  }

  const venueExists = await prisma.venue.findUnique({
    where: {
      id: venueId
    },
    select: {
      id: true
    }
  });

  if (!venueExists) {
    throw new EventServiceError(404, "Venue not found.");
  }

  const event = await prisma.$transaction(async (transaction) => {
    return transaction.event.create({
      data: {
        title,
        description,
        date,
        venueId,
        ticketingMode,
        currency: currency.toUpperCase(),
        salesStartAt,
        salesEndAt,
        publishStatus,
        ticketTiers:
          ticketingMode === "GA"
            ? {
                create: ticketTiers.map((tier) => ({
                  name: tier.name,
                  price: tier.price,
                  quantity: tier.quantity
                }))
              }
            : undefined
      },
      include: eventDetailInclude
    });
  });

  invalidateEventCaches();
  return mapEventDetail(event);
}

export async function listEvents(query: unknown): Promise<{
  data: Array<{
    id: string;
    title: string;
    date: Date;
    ticketingMode: TicketingMode;
    currency: string;
    salesStartAt: Date | null;
    salesEndAt: Date | null;
    publishStatus: "DRAFT" | "PUBLISHED";
    venue: {
      name: string;
      location: string;
    };
    lowestTicketPrice: number | null;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const parsedQuery = parseListEventsQuery(query);
  const cacheKey = buildListEventsCacheKey(parsedQuery);

  return withCache({
    key: cacheKey,
    ttlMs: eventListTtlMs,
    resolver: async () => {
  const where: Prisma.EventWhereInput = {};

      if (parsedQuery.search) {
        where.title = {
          contains: parsedQuery.search,
          mode: "insensitive"
        };
      }

      if (parsedQuery.venue) {
        where.venue = {
          name: {
            contains: parsedQuery.venue,
            mode: "insensitive"
          }
        };
      }

      if (parsedQuery.date) {
        where.date = {
          gte: parsedQuery.date
        };
      }

      const orderBy = buildEventListOrderBy(parsedQuery.pagination.sortBy, parsedQuery.pagination.sortOrder);
      const { skip, take } = toSkipTake(parsedQuery.pagination);

      const [total, events] = await prisma.$transaction([
        prisma.event.count({ where }),
        prisma.event.findMany({
          where,
          select: eventListSelect,
          orderBy,
          skip,
          take
        })
      ]);

      const reservedEventIds = events
        .filter((event) => event.ticketingMode === "RESERVED")
        .map((event) => event.id);

      const reservedPriceByEventId =
        reservedEventIds.length > 0
          ? await fetchReservedLowestPrices(reservedEventIds)
          : new Map<string, number>();

      const data = events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        ticketingMode: event.ticketingMode,
        currency: event.currency,
        salesStartAt: event.salesStartAt,
        salesEndAt: event.salesEndAt,
        publishStatus: event.publishStatus,
        venue: event.venue,
        lowestTicketPrice:
          event.ticketingMode === "GA"
            ? event.ticketTiers[0]?.price
              ? Number(event.ticketTiers[0].price)
              : null
            : reservedPriceByEventId.get(event.id) ?? null
      }));

      return {
        data,
        meta: buildPaginationMeta({
          page: parsedQuery.pagination.page,
          limit: parsedQuery.pagination.limit,
          total
        })
      };
    }
  });
}

export async function listRecommendedEvents() {
  return withCache({
    key: "events:recommended",
    ttlMs: eventRecommendedTtlMs,
    resolver: async () => {
      const events = await prisma.event.findMany({
        where: {
          date: {
            gte: new Date()
          }
        },
        select: eventListSelect,
        orderBy: {
          date: "asc"
        },
        take: 6
      });

      const reservedEventIds = events
        .filter((event) => event.ticketingMode === "RESERVED")
        .map((event) => event.id);
      const reservedPriceByEventId =
        reservedEventIds.length > 0
          ? await fetchReservedLowestPrices(reservedEventIds)
          : new Map<string, number>();

      return events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        ticketingMode: event.ticketingMode,
        currency: event.currency,
        salesStartAt: event.salesStartAt,
        salesEndAt: event.salesEndAt,
        publishStatus: event.publishStatus,
        venue: event.venue,
        lowestTicketPrice:
          event.ticketingMode === "GA"
            ? event.ticketTiers[0]?.price
              ? Number(event.ticketTiers[0].price)
              : null
            : reservedPriceByEventId.get(event.id) ?? null
      }));
    }
  });
}

export async function getEventById(eventId: string) {
  return withCache({
    key: `events:detail:${eventId}`,
    ttlMs: eventDetailTtlMs,
    resolver: async () => {
      const event = await prisma.event.findUnique({
        where: {
          id: eventId
        },
        include: eventDetailInclude
      });

      if (!event) {
        throw new EventServiceError(404, "Event not found.");
      }

      return mapEventDetail(event);
    }
  });
}

export function invalidateEventCaches(eventId?: string): void {
  appCache.clearByPrefix("events:list:");
  appCache.del("events:recommended");

  if (eventId) {
    appCache.del(`events:detail:${eventId}`);
  } else {
    appCache.clearByPrefix("events:detail:");
  }
}

function parseListEventsQuery(query: unknown): {
  search?: string;
  venue?: string;
  date?: Date;
  pagination: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: "asc" | "desc";
  };
} {
  const parsedQuery = listEventsQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new EventServiceError(400, parsedQuery.error.issues[0]?.message ?? "Invalid events query.");
  }

  const pagination = parsePaginationQuery(query, {
    defaultLimit: 12,
    maxLimit: 50,
    defaultSortBy: "date",
    defaultSortOrder: "asc",
    allowedSortBy: [...listEventsSortColumns]
  });

  const nextQuery: {
    search?: string;
    venue?: string;
    date?: Date;
    pagination: typeof pagination;
  } = {
    pagination
  };

  if (parsedQuery.data.search) {
    nextQuery.search = parsedQuery.data.search;
  }

  if (parsedQuery.data.venue) {
    nextQuery.venue = parsedQuery.data.venue;
  }

  if (parsedQuery.data.date) {
    const parsedDate = new Date(parsedQuery.data.date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new EventServiceError(400, "Invalid date query parameter.");
    }

    nextQuery.date = parsedDate;
  }

  return nextQuery;
}

function mapEventDetail(event: {
  id: string;
  title: string;
  description: string;
  date: Date;
  ticketingMode: TicketingMode;
  currency: string;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  publishStatus: "DRAFT" | "PUBLISHED";
  venue: {
    id: string;
    name: string;
    location: string;
    createdAt: Date;
  };
  seatSections: Array<{
    id: string;
  }>;
  presaleRules: Array<{
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
    isActive: boolean;
  }>;
  ticketTiers: Array<{
    id: string;
    name: string;
    price: Prisma.Decimal;
    quantity: number;
  }>;
}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    ticketingMode: event.ticketingMode,
    currency: event.currency,
    salesStartAt: event.salesStartAt,
    salesEndAt: event.salesEndAt,
    publishStatus: event.publishStatus,
    seatMapExists: event.seatSections.length > 0,
    activePresale: resolveActivePresale(event.presaleRules),
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      location: event.venue.location
    },
    ticketTiers: event.ticketTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: Number(tier.price),
      quantityRemaining: tier.quantity
    }))
  };
}

function resolveActivePresale(
  presales: Array<{
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
    isActive: boolean;
  }>
): {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  accessType: "PUBLIC" | "CODE" | "LINK_ONLY";
} | null {
  const now = new Date();
  const activePresale = presales.find(
    (presale) => presale.isActive && presale.startsAt <= now && presale.endsAt >= now
  );

  if (!activePresale) {
    return null;
  }

  return {
    id: activePresale.id,
    name: activePresale.name,
    startsAt: activePresale.startsAt,
    endsAt: activePresale.endsAt,
    accessType: activePresale.accessType
  };
}

function buildListEventsCacheKey(input: {
  search?: string;
  venue?: string;
  date?: Date;
  pagination: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: "asc" | "desc";
  };
}): string {
  return [
    "events:list",
    `search=${input.search ?? ""}`,
    `venue=${input.venue ?? ""}`,
    `date=${input.date ? input.date.toISOString() : ""}`,
    `page=${input.pagination.page}`,
    `limit=${input.pagination.limit}`,
    `sortBy=${input.pagination.sortBy ?? ""}`,
    `sortOrder=${input.pagination.sortOrder}`
  ].join(":");
}

function buildEventListOrderBy(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc"
): Prisma.EventOrderByWithRelationInput {
  if (!sortBy || !listEventsSortColumns.includes(sortBy as (typeof listEventsSortColumns)[number])) {
    return {
      date: "asc"
    };
  }

  return {
    [sortBy]: sortOrder
  } as Prisma.EventOrderByWithRelationInput;
}

async function fetchReservedLowestPrices(
  eventIds: string[]
): Promise<Map<string, number>> {
  if (eventIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.$queryRaw<Array<{ eventId: string; minPrice: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT ss."eventId" AS "eventId", MIN(s."price") AS "minPrice"
      FROM "Seat" s
      INNER JOIN "SeatRow" sr ON sr."id" = s."rowId"
      INNER JOIN "SeatSection" ss ON ss."id" = sr."sectionId"
      WHERE ss."eventId" IN (${Prisma.join(eventIds)})
      GROUP BY ss."eventId"
    `
  );

  const priceMap = new Map<string, number>();
  for (const row of rows) {
    priceMap.set(row.eventId, Number(row.minPrice));
  }

  return priceMap;
}

function parseTtl(variableName: string, fallbackMs: number): number {
  const rawValue = process.env[variableName];
  if (!rawValue) {
    return fallbackMs;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackMs;
}
