import { prisma, type Prisma } from "@ticketing/db";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export class PaymentServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new PaymentServiceError(500, "STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient = new Stripe(secretKey, {
    appInfo: {
      name: "ticketing-platform-api"
    }
  });

  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new PaymentServiceError(500, "STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return webhookSecret;
}

export async function createStripePaymentIntent(input: {
  orderId: string;
  eventId: string;
  amountDollars: number;
  checkoutAttemptId: string;
}): Promise<Stripe.PaymentIntent> {
  if (!Number.isFinite(input.amountDollars) || input.amountDollars <= 0) {
    throw new PaymentServiceError(400, "Payment amount must be greater than zero.");
  }

  const amountCents = Math.round(input.amountDollars * 100);

  return getStripeClient().paymentIntents.create(
    {
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        orderId: input.orderId,
        eventId: input.eventId,
        checkoutAttemptId: input.checkoutAttemptId
      }
    },
    {
      idempotencyKey: `${input.orderId}:${input.checkoutAttemptId}`
    }
  );
}

export async function recordStripePayment(input: {
  orderId: string;
  paymentIntentId: string;
  amountDollars: number;
}) {
  return prisma.payment.create({
    data: {
      orderId: input.orderId,
      provider: "STRIPE",
      paymentIntentId: input.paymentIntentId,
      amount: input.amountDollars,
      status: "PENDING"
    }
  });
}

export async function handleStripePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const fulfilledOrderId = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: {
        paymentIntentId: paymentIntent.id
      },
      include: {
        order: {
          include: {
            event: {
              select: {
                id: true,
                ticketingMode: true
              }
            },
            items: true
          }
        }
      }
    });

    if (!payment) {
      return null;
    }

    if (payment.status === "SUCCESS" || payment.order.status === "PAID") {
      return null;
    }

    if (payment.status === "FAILED" || payment.order.status === "FAILED") {
      return null;
    }

    const canFulfill =
      payment.order.event.ticketingMode === "RESERVED"
        ? await fulfillReservedOrder(transaction, payment.order.id, payment.order.event.id)
        : await fulfillGAOrder(transaction, payment.order.id, payment.order.event.id);

    if (!canFulfill) {
      await markOrderAndPaymentFailed(transaction, payment.order.id, payment.id);
      return null;
    }

    await transaction.order.update({
      where: {
        id: payment.order.id
      },
      data: {
        status: "PAID"
      }
    });

    await transaction.payment.update({
      where: {
        id: payment.id
      },
      data: {
        status: "SUCCESS"
      }
    });

    return payment.order.id;
  });

  if (fulfilledOrderId) {
    runOrderConfirmationPlaceholder(fulfilledOrderId);
  }
}

export async function handleStripePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: {
        paymentIntentId: paymentIntent.id
      },
      include: {
        order: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!payment) {
      return;
    }

    if (payment.status === "SUCCESS" || payment.order.status === "PAID") {
      return;
    }

    await markOrderAndPaymentFailed(transaction, payment.order.id, payment.id);
  });
}

async function fulfillReservedOrder(
  transaction: Prisma.TransactionClient,
  orderId: string,
  eventId: string
): Promise<boolean> {
  const orderItems = await transaction.orderItem.findMany({
    where: {
      orderId
    },
    select: {
      seatId: true
    }
  });

  const seatIds = orderItems
    .map((item) => item.seatId)
    .filter((seatId): seatId is string => Boolean(seatId));

  if (seatIds.length === 0 || seatIds.length !== orderItems.length) {
    return false;
  }

  const seats = await transaction.seat.findMany({
    where: {
      id: {
        in: seatIds
      }
    },
    select: {
      id: true,
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
  });

  if (seats.length !== seatIds.length) {
    return false;
  }

  const allSeatsAvailable = seats.every(
    (seat) => seat.status === "AVAILABLE" && seat.row.section.eventId === eventId
  );

  if (!allSeatsAvailable) {
    return false;
  }

  const updateResult = await transaction.seat.updateMany({
    where: {
      id: {
        in: seatIds
      },
      status: "AVAILABLE"
    },
    data: {
      status: "SOLD"
    }
  });

  return updateResult.count === seatIds.length;
}

async function fulfillGAOrder(
  transaction: Prisma.TransactionClient,
  orderId: string,
  eventId: string
): Promise<boolean> {
  const orderItems = await transaction.orderItem.findMany({
    where: {
      orderId
    },
    select: {
      ticketTierId: true,
      quantity: true
    }
  });

  if (orderItems.length === 0) {
    return false;
  }

  const quantityByTierId = new Map<string, number>();

  for (const item of orderItems) {
    if (!item.ticketTierId) {
      return false;
    }

    quantityByTierId.set(
      item.ticketTierId,
      (quantityByTierId.get(item.ticketTierId) ?? 0) + item.quantity
    );
  }

  for (const [tierId, quantity] of quantityByTierId.entries()) {
    const updatedTier = await transaction.ticketTier.updateMany({
      where: {
        id: tierId,
        eventId,
        quantity: {
          gte: quantity
        }
      },
      data: {
        quantity: {
          decrement: quantity
        }
      }
    });

    if (updatedTier.count !== 1) {
      return false;
    }
  }

  return true;
}

async function markOrderAndPaymentFailed(
  transaction: Prisma.TransactionClient,
  orderId: string,
  paymentId: string
): Promise<void> {
  await transaction.order.update({
    where: {
      id: orderId
    },
    data: {
      status: "FAILED"
    }
  });

  await transaction.payment.update({
    where: {
      id: paymentId
    },
    data: {
      status: "FAILED"
    }
  });
}

function runOrderConfirmationPlaceholder(orderId: string): void {
  console.info(`Order ${orderId} marked as PAID. Confirmation workflow placeholder executed.`);
}
