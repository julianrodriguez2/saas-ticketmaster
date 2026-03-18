import { prisma, type SeatStatus, type TicketingMode } from "@ticketing/db";
import { z } from "zod";

const salesVelocityQuerySchema = z.object({
  eventId: z.string().min(1).optional()
});

const RECENT_SALES_WINDOW_DAYS = 7;
const SALES_VELOCITY_WINDOW_DAYS = 30;

type SeatStatusBreakdown = Record<SeatStatus, number>;

type SalesSeriesPoint = {
  date: string;
  orderCount: number;
  revenue: number;
};

export class AdminAnalyticsServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function getAdminAnalyticsOverview(): Promise<{
  totalRevenue: number;
  totalPaidOrders: number;
  totalTicketsSold: number;
  totalUpcomingEvents: number;
  averageOrderValue: number;
  recentSalesCount: number;
}> {
  const now = new Date();
  const recentSalesStart = new Date(
    now.getTime() - RECENT_SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [paidAggregate, totalTicketsSold, totalUpcomingEvents, recentSalesCount] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          status: "PAID"
        },
        _sum: {
          totalAmount: true
        },
        _avg: {
          totalAmount: true
        },
        _count: {
          _all: true
        }
      }),
      prisma.ticket.count({
        where: {
          order: {
            status: "PAID"
          }
        }
      }),
      prisma.event.count({
        where: {
          date: {
            gte: now
          }
        }
      }),
      prisma.order.count({
        where: {
          status: "PAID",
          createdAt: {
            gte: recentSalesStart
          }
        }
      })
    ]);

  return {
    totalRevenue: Number(paidAggregate._sum.totalAmount ?? 0),
    totalPaidOrders: paidAggregate._count._all,
    totalTicketsSold,
    totalUpcomingEvents,
    averageOrderValue: Number(paidAggregate._avg.totalAmount ?? 0),
    recentSalesCount
  };
}

export async function listEventPerformance(): Promise<Array<{
  eventId: string;
  title: string;
  date: Date;
  ticketingMode: TicketingMode;
  venue: {
    name: string;
    location: string;
  };
  totalRevenue: number;
  ticketsSold: number;
  remainingInventory: number;
  occupancyPercentage: number;
  orderCount: number;
}>> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      date: true,
      ticketingMode: true,
      venue: {
        select: {
          name: true,
          location: true
        }
      }
    },
    orderBy: {
      date: "asc"
    }
  });

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);
  const reservedEventIds = events
    .filter((event) => event.ticketingMode === "RESERVED")
    .map((event) => event.id);

  const [paidOrdersByEvent, ticketsByEvent, gaRemainingByEvent, seatStatusRows] =
    await Promise.all([
      prisma.order.groupBy({
        by: ["eventId"],
        where: {
          status: "PAID",
          eventId: {
            in: eventIds
          }
        },
        _sum: {
          totalAmount: true
        },
        _count: {
          _all: true
        }
      }),
      prisma.ticket.groupBy({
        by: ["eventId"],
        where: {
          order: {
            status: "PAID"
          },
          eventId: {
            in: eventIds
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.ticketTier.groupBy({
        by: ["eventId"],
        where: {
          eventId: {
            in: eventIds
          }
        },
        _sum: {
          quantity: true
        }
      }),
      reservedEventIds.length > 0
        ? prisma.seat.findMany({
            where: {
              row: {
                section: {
                  eventId: {
                    in: reservedEventIds
                  }
                }
              }
            },
            select: {
              status: true,
              row: {
                select: {
                  section: {
                    select: {
                      eventId: true
                    }
                  }
                }
              }
            }
          })
        : Promise.resolve(
            [] as Array<{
              status: SeatStatus;
              row: {
                section: {
                  eventId: string;
                };
              };
            }>
          )
    ]);

  const paidOrdersMap = new Map(
    paidOrdersByEvent.map((row) => [
      row.eventId,
      {
        totalRevenue: Number(row._sum.totalAmount ?? 0),
        orderCount: row._count._all
      }
    ])
  );

  const ticketsSoldMap = new Map(
    ticketsByEvent.map((row) => [row.eventId, row._count._all])
  );

  const gaRemainingMap = new Map(
    gaRemainingByEvent.map((row) => [row.eventId, row._sum.quantity ?? 0])
  );

  const reservedSeatStatsMap = getSeatStatsByEvent(seatStatusRows);

  return events.map((event) => {
    const orderStats = paidOrdersMap.get(event.id) ?? {
      totalRevenue: 0,
      orderCount: 0
    };
    const ticketsSold = ticketsSoldMap.get(event.id) ?? 0;
    const reservedSeatStats = reservedSeatStatsMap.get(event.id) ?? {
      total: 0,
      available: 0,
      sold: 0
    };

    const remainingInventory =
      event.ticketingMode === "GA"
        ? gaRemainingMap.get(event.id) ?? 0
        : reservedSeatStats.available;

    const totalInventory =
      event.ticketingMode === "GA"
        ? ticketsSold + remainingInventory
        : reservedSeatStats.total;

    const occupiedCount =
      event.ticketingMode === "GA" ? ticketsSold : reservedSeatStats.sold;

    const occupancyPercentage =
      totalInventory > 0 ? (occupiedCount / totalInventory) * 100 : 0;

    return {
      eventId: event.id,
      title: event.title,
      date: event.date,
      ticketingMode: event.ticketingMode,
      venue: event.venue,
      totalRevenue: orderStats.totalRevenue,
      ticketsSold,
      remainingInventory,
      occupancyPercentage,
      orderCount: orderStats.orderCount
    };
  });
}

export async function getEventAnalyticsDetail(eventId: string): Promise<{
  event: {
    id: string;
    title: string;
    description: string;
    date: Date;
    ticketingMode: TicketingMode;
    venue: {
      name: string;
      location: string;
    };
  };
  metrics: {
    totalRevenue: number;
    paidOrders: number;
    ticketsSold: number;
    attendeeCount: number;
    averageOrderValue: number;
    remainingInventory: number;
    occupancyPercentage: number;
  };
  ticketBreakdownByTier: Array<{
    tierId: string;
    name: string;
    ticketsSold: number;
    revenue: number;
  }>;
  seatStatusBreakdown: {
    available: number;
    reserved: number;
    sold: number;
    blocked: number;
    total: number;
  };
  dailySalesSeries: SalesSeriesPoint[];
  recentOrders: Array<{
    id: string;
    customerEmail: string | null;
    totalAmount: number;
    status: "PAID";
    createdAt: Date;
    ticketCount: number;
  }>;
}> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      ticketingMode: true,
      venue: {
        select: {
          name: true,
          location: true
        }
      }
    }
  });

  if (!event) {
    throw new AdminAnalyticsServiceError(404, "Event not found.");
  }

  const seriesStartDate = new Date(
    Date.now() - SALES_VELOCITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [
    paidAggregate,
    ticketsSold,
    recentOrders,
    ordersForSeries,
    gaOrderItems,
    gaRemainingAggregate,
    reservedSeatStatusGroups
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        eventId,
        status: "PAID"
      },
      _sum: {
        totalAmount: true
      },
      _avg: {
        totalAmount: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.ticket.count({
      where: {
        eventId,
        order: {
          status: "PAID"
        }
      }
    }),
    prisma.order.findMany({
      where: {
        eventId,
        status: "PAID"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10,
      select: {
        id: true,
        email: true,
        totalAmount: true,
        status: true,
        createdAt: true,
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
    }),
    prisma.order.findMany({
      where: {
        eventId,
        status: "PAID",
        createdAt: {
          gte: seriesStartDate
        }
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          eventId,
          status: "PAID"
        },
        ticketTierId: {
          not: null
        }
      },
      select: {
        ticketTierId: true,
        quantity: true,
        price: true,
        ticketTier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.ticketTier.aggregate({
      where: {
        eventId
      },
      _sum: {
        quantity: true
      }
    }),
    event.ticketingMode === "RESERVED"
      ? prisma.seat.groupBy({
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
        })
      : Promise.resolve(
          [] as Array<{
            status: SeatStatus;
            _count: {
              _all: number;
            };
          }>
        )
  ]);

  const ticketBreakdownByTier = getTicketTierBreakdown(gaOrderItems);
  const seatStatusBreakdown = getSeatStatusBreakdown(
    event.ticketingMode,
    reservedSeatStatusGroups,
    gaRemainingAggregate._sum.quantity ?? 0,
    ticketsSold
  );

  const totalInventory = seatStatusBreakdown.total;
  const occupancyPercentage =
    totalInventory > 0 ? (seatStatusBreakdown.sold / totalInventory) * 100 : 0;

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      ticketingMode: event.ticketingMode,
      venue: {
        name: event.venue.name,
        location: event.venue.location
      }
    },
    metrics: {
      totalRevenue: Number(paidAggregate._sum.totalAmount ?? 0),
      paidOrders: paidAggregate._count._all,
      ticketsSold,
      attendeeCount: ticketsSold,
      averageOrderValue: Number(paidAggregate._avg.totalAmount ?? 0),
      remainingInventory: seatStatusBreakdown.available,
      occupancyPercentage
    },
    ticketBreakdownByTier,
    seatStatusBreakdown,
    dailySalesSeries: buildSalesSeries(ordersForSeries),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      customerEmail: order.email ?? order.user?.email ?? null,
      totalAmount: Number(order.totalAmount),
      status: "PAID",
      createdAt: order.createdAt,
      ticketCount: order._count.tickets
    }))
  };
}

export async function getSalesVelocity(
  query: unknown
): Promise<{
  eventId: string | null;
  windowDays: number;
  series: SalesSeriesPoint[];
  totalRevenue: number;
  totalOrders: number;
}> {
  const parsedQuery = salesVelocityQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    throw new AdminAnalyticsServiceError(
      400,
      parsedQuery.error.issues[0]?.message ?? "Invalid sales velocity query."
    );
  }

  const { eventId } = parsedQuery.data;

  if (eventId) {
    const eventExists = await prisma.event.findUnique({
      where: {
        id: eventId
      },
      select: {
        id: true
      }
    });

    if (!eventExists) {
      throw new AdminAnalyticsServiceError(404, "Event not found.");
    }
  }

  const startDate = new Date(
    Date.now() - SALES_VELOCITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const paidOrders = await prisma.order.findMany({
    where: {
      status: "PAID",
      createdAt: {
        gte: startDate
      },
      ...(eventId ? { eventId } : {})
    },
    select: {
      createdAt: true,
      totalAmount: true
    }
  });

  const series = buildSalesSeries(paidOrders);
  const totals = paidOrders.reduce(
    (accumulator, order) => {
      return {
        totalRevenue: accumulator.totalRevenue + Number(order.totalAmount),
        totalOrders: accumulator.totalOrders + 1
      };
    },
    {
      totalRevenue: 0,
      totalOrders: 0
    }
  );

  return {
    eventId: eventId ?? null,
    windowDays: SALES_VELOCITY_WINDOW_DAYS,
    series,
    totalRevenue: totals.totalRevenue,
    totalOrders: totals.totalOrders
  };
}

function getSeatStatsByEvent(
  seatRows: Array<{
    status: SeatStatus;
    row: {
      section: {
        eventId: string;
      };
    };
  }>
): Map<
  string,
  {
    total: number;
    available: number;
    sold: number;
  }
> {
  const statsByEvent = new Map<
    string,
    {
      total: number;
      available: number;
      sold: number;
    }
  >();

  for (const seat of seatRows) {
    const eventId = seat.row.section.eventId;
    const currentStats = statsByEvent.get(eventId) ?? {
      total: 0,
      available: 0,
      sold: 0
    };

    currentStats.total += 1;

    if (seat.status === "AVAILABLE") {
      currentStats.available += 1;
    }

    if (seat.status === "SOLD") {
      currentStats.sold += 1;
    }

    statsByEvent.set(eventId, currentStats);
  }

  return statsByEvent;
}

function getSeatStatusBreakdown(
  ticketingMode: TicketingMode,
  reservedSeatStatusGroups: Array<{
    status: SeatStatus;
    _count: {
      _all: number;
    };
  }>,
  gaRemainingInventory: number,
  ticketsSold: number
): {
  available: number;
  reserved: number;
  sold: number;
  blocked: number;
  total: number;
} {
  if (ticketingMode === "GA") {
    const total = gaRemainingInventory + ticketsSold;
    return {
      available: gaRemainingInventory,
      reserved: 0,
      sold: ticketsSold,
      blocked: 0,
      total
    };
  }

  const breakdown: SeatStatusBreakdown = {
    AVAILABLE: 0,
    RESERVED: 0,
    SOLD: 0,
    BLOCKED: 0
  };

  for (const group of reservedSeatStatusGroups) {
    breakdown[group.status] = group._count._all;
  }

  return {
    available: breakdown.AVAILABLE,
    reserved: breakdown.RESERVED,
    sold: breakdown.SOLD,
    blocked: breakdown.BLOCKED,
    total:
      breakdown.AVAILABLE +
      breakdown.RESERVED +
      breakdown.SOLD +
      breakdown.BLOCKED
  };
}

function getTicketTierBreakdown(
  items: Array<{
    ticketTierId: string | null;
    quantity: number;
    price: { toString(): string };
    ticketTier: {
      id: string;
      name: string;
    } | null;
  }>
): Array<{
  tierId: string;
  name: string;
  ticketsSold: number;
  revenue: number;
}> {
  const breakdownMap = new Map<
    string,
    {
      tierId: string;
      name: string;
      ticketsSold: number;
      revenue: number;
    }
  >();

  for (const item of items) {
    if (!item.ticketTierId || !item.ticketTier) {
      continue;
    }

    const currentTier = breakdownMap.get(item.ticketTierId) ?? {
      tierId: item.ticketTier.id,
      name: item.ticketTier.name,
      ticketsSold: 0,
      revenue: 0
    };
    const unitPrice = Number(item.price);

    currentTier.ticketsSold += item.quantity;
    currentTier.revenue += unitPrice * item.quantity;

    breakdownMap.set(item.ticketTierId, currentTier);
  }

  return Array.from(breakdownMap.values()).sort(
    (a, b) => b.ticketsSold - a.ticketsSold
  );
}

function buildSalesSeries(
  orders: Array<{
    createdAt: Date;
    totalAmount: { toString(): string };
  }>
): SalesSeriesPoint[] {
  const groupedByDay = new Map<string, SalesSeriesPoint>();

  for (const order of orders) {
    const dayKey = order.createdAt.toISOString().slice(0, 10);
    const currentPoint = groupedByDay.get(dayKey) ?? {
      date: dayKey,
      orderCount: 0,
      revenue: 0
    };

    currentPoint.orderCount += 1;
    currentPoint.revenue += Number(order.totalAmount);
    groupedByDay.set(dayKey, currentPoint);
  }

  return Array.from(groupedByDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
