import { prisma, type Role } from "@ticketing/db";

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

export async function getOrderById(
  orderId: string,
  requester: Requester | null
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
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    ticketTier: {
      id: string;
      name: string;
    } | null;
    seat: {
      id: string;
      section: string;
      row: string;
      seatNumber: string;
      label: string | null;
    } | null;
  }>;
  payment: {
    provider: "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED";
    paymentIntentId: string;
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
      items: {
        include: {
          ticketTier: {
            select: {
              id: true,
              name: true
            }
          },
          seat: {
            select: {
              id: true,
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
          }
        }
      },
      payment: {
        select: {
          provider: true,
          status: true,
          paymentIntentId: true
        }
      }
    }
  });

  if (!order) {
    throw new OrderServiceError(404, "Order not found.");
  }

  if (order.userId) {
    if (!requester) {
      throw new OrderServiceError(403, "You are not authorized to view this order.");
    }

    if (requester.role !== "ADMIN" && requester.userId !== order.userId) {
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
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: Number(item.price),
      ticketTier: item.ticketTier,
      seat: item.seat
        ? {
            id: item.seat.id,
            section: item.seat.row.section.name,
            row: item.seat.row.label,
            seatNumber: item.seat.seatNumber,
            label: item.seat.label
          }
        : null
    })),
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          paymentIntentId: order.payment.paymentIntentId
        }
      : null
  };
}
