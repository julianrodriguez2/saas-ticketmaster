import { prisma, type SeatStatus, type TicketingMode } from "@ticketing/db";
import { z } from "zod";
import { appCache, withCache } from "../../utils/cache";
import { invalidateEventCaches } from "../events/event.service";

const seatStatusEnum = z.enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]);

const seatMapPayloadSchema = z.object({
  sections: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        color: z.string().trim().min(1).max(50).optional(),
        rows: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(20),
              sortOrder: z.coerce.number().int().positive(),
              seats: z
                .array(
                  z.object({
                    seatNumber: z.string().trim().min(1).max(20),
                    x: z.coerce.number().int().nonnegative(),
                    y: z.coerce.number().int().nonnegative(),
                    price: z.coerce.number().positive(),
                    status: seatStatusEnum.optional(),
                    label: z.string().trim().min(1).max(30).optional()
                  })
                )
                .min(1)
            })
          )
          .min(1)
      })
    )
    .min(1)
});

const reservedSelectionSchema = z.object({
  seatIds: z.array(z.string().min(1)).min(1).max(8)
});

const gaSelectionSchema = z.object({
  tierId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(20)
});

export class SeatMapServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function replaceSeatMap(eventId: string, input: unknown) {
  const event = await getEventOrThrow(eventId);
  assertReservedMode(event.ticketingMode);

  const parsedPayload = seatMapPayloadSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new SeatMapServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid seat map payload."
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.seatSection.deleteMany({
      where: {
        eventId
      }
    });

    for (const section of parsedPayload.data.sections) {
      await transaction.seatSection.create({
        data: {
          eventId,
          name: section.name,
          color: section.color,
          rows: {
            create: section.rows.map((row) => ({
              label: row.label,
              sortOrder: row.sortOrder,
              seats: {
                create: row.seats.map((seat) => ({
                  seatNumber: seat.seatNumber,
                  x: seat.x,
                  y: seat.y,
                  price: seat.price,
                  status: seat.status ?? "AVAILABLE",
                  label: seat.label ?? `${row.label}-${seat.seatNumber}`
                }))
              }
            }))
          }
        }
      });
    }
  });

  invalidateSeatMapCaches(eventId);
  invalidateEventCaches(eventId);
  return getAdminSeatMap(eventId);
}

export async function getAdminSeatMap(eventId: string) {
  const event = await getEventOrThrow(eventId);
  assertReservedMode(event.ticketingMode);

  const sections = await prisma.seatSection.findMany({
    where: {
      eventId
    },
    orderBy: {
      createdAt: "asc"
    },
    include: {
      rows: {
        orderBy: {
          sortOrder: "asc"
        },
        include: {
          seats: {
            orderBy: [
              {
                y: "asc"
              },
              {
                x: "asc"
              }
            ]
          }
        }
      }
    }
  });

  return {
    eventId: event.id,
    ticketingMode: event.ticketingMode,
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
      color: section.color,
      rows: section.rows.map((row) => ({
        id: row.id,
        label: row.label,
        sortOrder: row.sortOrder,
        seats: row.seats.map((seat) => ({
          id: seat.id,
          seatNumber: seat.seatNumber,
          label: seat.label,
          x: seat.x,
          y: seat.y,
          price: Number(seat.price),
          status: seat.status
        }))
      }))
    }))
  };
}

export async function getPublicSeatMap(eventId: string) {
  return withCache({
    key: `seatmap:public:${eventId}`,
    ttlMs: parseTtl("SEATMAP_CACHE_TTL_MS", 15_000),
    resolver: async () => {
      const event = await getEventOrThrow(eventId);
      assertReservedMode(event.ticketingMode);

      const sections = await prisma.seatSection.findMany({
        where: {
          eventId
        },
        orderBy: {
          createdAt: "asc"
        },
        include: {
          rows: {
            orderBy: {
              sortOrder: "asc"
            },
            include: {
              seats: {
                orderBy: [
                  {
                    y: "asc"
                  },
                  {
                    x: "asc"
                  }
                ]
              }
            }
          }
        }
      });

      return {
        eventId: event.id,
        ticketingMode: event.ticketingMode,
        sections: sections.map((section) => ({
          name: section.name,
          color: section.color,
          rows: section.rows.map((row) => ({
            label: row.label,
            sortOrder: row.sortOrder,
            seats: row.seats.map((seat) => ({
              id: seat.id,
              seatNumber: seat.seatNumber,
              label: seat.label,
              x: seat.x,
              y: seat.y,
              price: Number(seat.price),
              status: seat.status
            }))
          }))
        }))
      };
    }
  });
}

export async function getEventAvailability(eventId: string) {
  return withCache({
    key: `availability:${eventId}`,
    ttlMs: parseTtl("EVENT_AVAILABILITY_CACHE_TTL_MS", 10_000),
    resolver: async () => {
      const event = await getEventOrThrow(eventId);

      if (event.ticketingMode === "GA") {
        const gaCounts = await prisma.ticketTier.aggregate({
          where: {
            eventId
          },
          _sum: {
            quantity: true
          }
        });

        return {
          eventId: event.id,
          ticketingMode: event.ticketingMode,
          availableSeats: gaCounts._sum.quantity ?? 0,
          soldSeats: 0,
          reservedSeats: 0,
          blockedSeats: 0
        };
      }

      const groupedCounts = await prisma.seat.groupBy({
        by: ["status"],
        where: {
          row: {
            section: {
              eventId
            }
          }
        },
        _count: {
          _all: true
        }
      });

      const counts = {
        AVAILABLE: 0,
        RESERVED: 0,
        SOLD: 0,
        BLOCKED: 0
      } satisfies Record<SeatStatus, number>;

      for (const statusGroup of groupedCounts) {
        counts[statusGroup.status] = statusGroup._count._all;
      }

      return {
        eventId: event.id,
        ticketingMode: event.ticketingMode,
        availableSeats: counts.AVAILABLE,
        soldSeats: counts.SOLD,
        reservedSeats: counts.RESERVED,
        blockedSeats: counts.BLOCKED
      };
    }
  });
}

export async function validateSelection(eventId: string, input: unknown) {
  const event = await getEventOrThrow(eventId);

  if (event.ticketingMode === "RESERVED") {
    return validateReservedSelection(eventId, input);
  }

  return validateGASelection(eventId, input);
}

async function validateReservedSelection(eventId: string, input: unknown) {
  const parsedSelection = reservedSelectionSchema.safeParse(input);

  if (!parsedSelection.success) {
    throw new SeatMapServiceError(
      400,
      parsedSelection.error.issues[0]?.message ?? "Invalid seat selection payload."
    );
  }

  const uniqueSeatIds = Array.from(new Set(parsedSelection.data.seatIds));

  if (uniqueSeatIds.length === 0) {
    throw new SeatMapServiceError(400, "At least one seat must be selected.");
  }

  const seats = await prisma.seat.findMany({
    where: {
      id: {
        in: uniqueSeatIds
      }
    },
    include: {
      row: {
        include: {
          section: {
            select: {
              eventId: true,
              name: true
            }
          }
        }
      }
    }
  });

  const seatById = new Map(seats.map((seat) => [seat.id, seat]));
  const invalidSeatIds: string[] = [];
  const selectedSeats: Array<{
    id: string;
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
    price: number;
  }> = [];

  for (const seatId of uniqueSeatIds) {
    const seat = seatById.get(seatId);

    if (!seat || seat.row.section.eventId !== eventId || seat.status !== "AVAILABLE") {
      invalidSeatIds.push(seatId);
      continue;
    }

    selectedSeats.push({
      id: seat.id,
      section: seat.row.section.name,
      row: seat.row.label,
      seatNumber: seat.seatNumber,
      label: seat.label,
      price: Number(seat.price)
    });
  }

  const totalPrice = selectedSeats.reduce((total, seat) => total + seat.price, 0);

  return {
    valid: invalidSeatIds.length === 0,
    mode: "RESERVED" as const,
    selectedSeats,
    invalidSeatIds,
    totalPrice
  };
}

async function validateGASelection(eventId: string, input: unknown) {
  const parsedSelection = gaSelectionSchema.safeParse(input);

  if (!parsedSelection.success) {
    throw new SeatMapServiceError(
      400,
      parsedSelection.error.issues[0]?.message ?? "Invalid GA selection payload."
    );
  }

  const tier = await prisma.ticketTier.findFirst({
    where: {
      id: parsedSelection.data.tierId,
      eventId
    }
  });

  if (!tier) {
    return {
      valid: false,
      mode: "GA" as const,
      message: "Ticket tier not found.",
      quantity: parsedSelection.data.quantity,
      totalPrice: 0
    };
  }

  const valid = parsedSelection.data.quantity <= tier.quantity;

  return {
    valid,
    mode: "GA" as const,
    quantity: parsedSelection.data.quantity,
    totalPrice: Number(tier.price) * parsedSelection.data.quantity,
    availableQuantity: tier.quantity,
    tier: {
      id: tier.id,
      name: tier.name,
      price: Number(tier.price)
    },
    message: valid ? undefined : "Requested quantity exceeds available tickets."
  };
}

function assertReservedMode(ticketingMode: TicketingMode): void {
  if (ticketingMode !== "RESERVED") {
    throw new SeatMapServiceError(
      400,
      "Seat maps can only be configured for RESERVED events."
    );
  }
}

async function getEventOrThrow(eventId: string): Promise<{
  id: string;
  ticketingMode: TicketingMode;
}> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true,
      ticketingMode: true
    }
  });

  if (!event) {
    throw new SeatMapServiceError(404, "Event not found.");
  }

  return event;
}

export function invalidateSeatMapCaches(eventId: string): void {
  appCache.del(`seatmap:public:${eventId}`);
  appCache.del(`availability:${eventId}`);
}

function parseTtl(variableName: string, fallbackMs: number): number {
  const rawValue = process.env[variableName];
  if (!rawValue) {
    return fallbackMs;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackMs;
}
