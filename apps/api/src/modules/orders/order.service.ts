import { prisma, type Role, type TicketStatus } from "@ticketing/db";

export class OrderServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type Requester = {
  userId: string;
  role: Role;
};

export async function listOrdersForUser(userId: string): Promise<Array<{
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  totalAmount: number;
  createdAt: Date;
  event: {
    id: string;
    title: string;
  };
  ticketCount: number;
}>> {
  const orders = await prisma.order.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          title: true
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    event: order.event,
    ticketCount: order._count.tickets
  }));
}

export async function getOrderById(
  orderId: string,
  requester: Requester
): Promise<{
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  totalAmount: number;
  createdAt: Date;
  event: {
    id: string;
    title: string;
    date: Date;
    venue: {
      name: string;
      location: string;
    };
  };
  tickets: Array<{
    id: string;
    code: string;
    status: TicketStatus;
    issuedAt: Date;
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
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
    amount: number;
  } | null;
}> {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    include: {
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
      tickets: {
        orderBy: {
          issuedAt: "asc"
        },
        select: {
          id: true,
          code: true,
          status: true,
          issuedAt: true,
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
      payment: {
        select: {
          provider: true,
          status: true,
          paymentIntentId: true,
          amount: true
        }
      }
    }
  });

  if (!order) {
    throw new OrderServiceError(404, "Order not found.");
  }

  if (requester.role !== "ADMIN") {
    if (!order.userId || order.userId !== requester.userId) {
      throw new OrderServiceError(403, "You are not authorized to view this order.");
    }
  }

  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    event: {
      id: order.event.id,
      title: order.event.title,
      date: order.event.date,
      venue: {
        name: order.event.venue.name,
        location: order.event.venue.location
      }
    },
    tickets: order.tickets.map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
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
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          paymentIntentId: order.payment.paymentIntentId,
          amount: Number(order.payment.amount)
        }
      : null
  };
}

export async function getOrderEmailAndSummary(orderId: string): Promise<{
  email: string | null;
  eventTitle: string;
  eventDate: Date;
  venueName: string;
  venueLocation: string;
  totalAmount: number;
  ticketCount: number;
} | null> {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      email: true,
      user: {
        select: {
          email: true
        }
      },
      totalAmount: true,
      event: {
        select: {
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
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  return {
    email: order.email ?? order.user?.email ?? null,
    eventTitle: order.event.title,
    eventDate: order.event.date,
    venueName: order.event.venue.name,
    venueLocation: order.event.venue.location,
    totalAmount: Number(order.totalAmount),
    ticketCount: order._count.tickets
  };
}
