import type { Prisma } from "@prisma/client";
import { prisma } from "@ticketing/db";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(5000),
  date: z.coerce.date(),
  venueId: z.string().min(1),
  ticketTiers: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        price: z.coerce.number().positive(),
        quantity: z.coerce.number().int().positive()
      })
    )
    .min(1)
});

const listEventsQuerySchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  date: z.string().trim().min(1).optional()
});

const eventListSelect = {
  id: true,
  title: true,
  date: true,
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
} as const;

const eventDetailInclude = {
  venue: true,
  ticketTiers: {
    orderBy: {
      price: "asc"
    }
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

  const { title, description, date, venueId, ticketTiers } = parsedPayload.data;

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
        ticketTiers: {
          create: ticketTiers.map((tier) => ({
            name: tier.name,
            price: tier.price,
            quantity: tier.quantity
          }))
        }
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
    venue: event.venue,
    lowestTicketPrice:
      event.ticketTiers[0] ? Number(event.ticketTiers[0].price) : null
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
    venue: event.venue,
    lowestTicketPrice:
      event.ticketTiers[0] ? Number(event.ticketTiers[0].price) : null
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

function mapEventDetail(event: {
  id: string;
  title: string;
  description: string;
  date: Date;
  venue: {
    id: string;
    name: string;
    location: string;
    createdAt: Date;
  };
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
