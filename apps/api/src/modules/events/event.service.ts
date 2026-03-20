import { prisma, type Prisma, type TicketingMode } from "@ticketing/db";
import { z } from "zod";

const createEventSchema = z.object({
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
}).superRefine((payload, context) => {
  if (payload.salesStartAt && payload.salesEndAt && payload.salesStartAt >= payload.salesEndAt) {
    context.addIssue({
      code: "custom",
      message: "Sales start must be before sales end."
    });
  }
});

const listEventsQuerySchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  date: z.string().trim().min(1).optional()
});

const eventListSelect = {
  id: true,
  title: true,
  date: true,
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
  },
  seatSections: {
    select: {
      rows: {
        select: {
          seats: {
            select: {
              price: true
            }
          }
        }
      }
    }
  }
} as const;

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
  } =
    parsedPayload.data;

  if (ticketingMode === "GA" && ticketTiers.length === 0) {
    throw new EventServiceError(
      400,
      "GA events must include at least one ticket tier."
    );
  }

  if (ticketingMode === "RESERVED" && ticketTiers.length > 0) {
    throw new EventServiceError(
      400,
      "Reserved events cannot include GA ticket tiers."
    );
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

  return mapEventDetail(event);
}

export async function listEvents(query: unknown) {
  const { search, date } = parseListEventsQuery(query);
  const where: Prisma.EventWhereInput = {};

  if (search) {
    where.title = {
      contains: search,
      mode: "insensitive"
    };
  }

  if (date) {
    where.date = {
      gte: date
    };
  }

  const events = await prisma.event.findMany({
    where,
    select: eventListSelect,
    orderBy: {
      date: "asc"
    }
  });

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
    lowestTicketPrice: getLowestTicketPrice({
      ticketingMode: event.ticketingMode,
      gaLowestPrice: event.ticketTiers[0]?.price,
      seatSections: event.seatSections
    })
  }));
}

export async function listRecommendedEvents() {
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
    lowestTicketPrice: getLowestTicketPrice({
      ticketingMode: event.ticketingMode,
      gaLowestPrice: event.ticketTiers[0]?.price,
      seatSections: event.seatSections
    })
  }));
}

export async function getEventById(eventId: string) {
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

function parseListEventsQuery(
  query: unknown
): {
  search?: string;
  date?: Date;
} {
  const parsedQuery = listEventsQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new EventServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid events query."
    );
  }

  const nextQuery: {
    search?: string;
    date?: Date;
  } = {};

  if (parsedQuery.data.search) {
    nextQuery.search = parsedQuery.data.search;
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

function getLowestTicketPrice(input: {
  ticketingMode: TicketingMode;
  gaLowestPrice: Prisma.Decimal | undefined;
  seatSections: Array<{
    rows: Array<{
      seats: Array<{
        price: Prisma.Decimal;
      }>;
    }>;
  }>;
}): number | null {
  if (input.ticketingMode === "GA") {
    return input.gaLowestPrice ? Number(input.gaLowestPrice) : null;
  }

  let lowestPrice: number | null = null;

  for (const section of input.seatSections) {
    for (const row of section.rows) {
      for (const seat of row.seats) {
        const currentPrice = Number(seat.price);

        if (lowestPrice === null || currentPrice < lowestPrice) {
          lowestPrice = currentPrice;
        }
      }
    }
  }

  return lowestPrice;
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
