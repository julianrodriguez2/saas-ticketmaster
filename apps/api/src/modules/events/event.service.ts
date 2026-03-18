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

const eventInclude = {
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

  return prisma.$transaction(async (transaction) => {
    const event = await transaction.event.create({
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
      include: eventInclude
    });

    return event;
  });
}

export async function listEvents() {
  return prisma.event.findMany({
    include: eventInclude,
    orderBy: {
      date: "asc"
    }
  });
}

export async function getEventById(eventId: string) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    include: eventInclude
  });

  if (!event) {
    throw new EventServiceError(404, "Event not found.");
  }

  return event;
}

