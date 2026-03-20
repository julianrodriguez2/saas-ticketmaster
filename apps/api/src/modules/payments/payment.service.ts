import { prisma, type Prisma } from "@ticketing/db";
import Stripe from "stripe";
import { createAdminNotificationSafe } from "../admin-notifications/adminNotification.service";
import {
  sendOrderConfirmationEmailSafe,
  sendPaymentFailureEmailSafe
} from "../email/email.service";
import { trackPaymentAttempt } from "../fraud/fraud.service";
import { getOrderEmailAndSummary } from "../orders/order.service";
import { recordSystemEventSafe } from "../system-events/systemEvent.service";
import { issueTicketsForOrder } from "../tickets/ticket.service";

let stripeClient: Stripe | null = null;

type FinalizedOrderResult =
  | {
      status: "PAID";
      orderId: string;
      eventId: string;
      newlyPaid: boolean;
      email: string | null;
      ipAddress: string | null;
    }
  | {
      status: "FAILED_INVENTORY";
      orderId: string;
      eventId: string;
      email: string | null;
      ipAddress: string | null;
    };

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
  const finalizedOrder = await finalizeOrderPayment(paymentIntent.id);

  if (!finalizedOrder) {
    return;
  }

  if (finalizedOrder.status === "FAILED_INVENTORY") {
    await createAdminNotificationSafe({
      type: "SEAT_OVERSELL_BLOCKED",
      severity: "CRITICAL",
      title: "Inventory safeguard blocked fulfillment",
      message: `Order ${finalizedOrder.orderId} failed final inventory validation after payment confirmation.`,
      relatedOrderId: finalizedOrder.orderId,
      relatedEventId: finalizedOrder.eventId,
      dedupeKey: `finalize-inventory-failed:${finalizedOrder.orderId}`
    });

    await recordSystemEventSafe({
      type: "INVENTORY_VALIDATION_FAILED",
      entityType: "ORDER",
      entityId: finalizedOrder.orderId,
      message: "Order fulfillment failed because inventory was unavailable at payment finalization.",
      metadata: {
        paymentIntentId: paymentIntent.id
      }
    });

    await trackPaymentAttempt({
      email: finalizedOrder.email,
      ipAddress: finalizedOrder.ipAddress,
      eventId: finalizedOrder.eventId,
      status: "FAILED",
      reason: "Inventory unavailable at payment finalization."
    });

    return;
  }

  await trackPaymentAttempt({
    email: finalizedOrder.email,
    ipAddress: finalizedOrder.ipAddress,
    eventId: finalizedOrder.eventId,
    status: "SUCCEEDED",
    reason: "Stripe payment intent succeeded."
  });

  await recordSystemEventSafe({
    type: "PAYMENT_SUCCEEDED",
    entityType: "ORDER",
    entityId: finalizedOrder.orderId,
    message: `Stripe payment intent ${paymentIntent.id} succeeded.`,
    metadata: {
      paymentIntentId: paymentIntent.id,
      newlyPaid: finalizedOrder.newlyPaid
    }
  });

  const issuance = await issueTicketsForOrder(finalizedOrder.orderId);

  if (finalizedOrder.newlyPaid || !issuance.alreadyIssued) {
    await sendOrderConfirmationForOrder(finalizedOrder.orderId, issuance.ticketCount);
  }
}

export async function handleStripePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const lastPaymentError = paymentIntent.last_payment_error;
  const failureReason =
    lastPaymentError?.message ?? "Payment was declined by the payment provider.";
  const providerResponseCode = lastPaymentError?.code ?? null;

  const failedPayment = await prisma.$transaction(async (transaction) => {
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
                title: true
              }
            },
            user: {
              select: {
                email: true
              }
            }
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

    await markOrderAndPaymentFailed(transaction, payment.order.id, payment.id, {
      failureReason,
      providerResponseCode
    });

    return {
      orderId: payment.order.id,
      eventId: payment.order.event.id,
      eventTitle: payment.order.event.title,
      email: payment.order.email ?? payment.order.user?.email ?? null,
      ipAddress: payment.order.ipAddress
    };
  });

  if (!failedPayment) {
    return;
  }

  await trackPaymentAttempt({
    email: failedPayment.email,
    ipAddress: failedPayment.ipAddress,
    eventId: failedPayment.eventId,
    status: "FAILED",
    reason: failureReason.slice(0, 280)
  });

  await recordSystemEventSafe({
    type: "PAYMENT_FAILED",
    entityType: "ORDER",
    entityId: failedPayment.orderId,
    message: `Stripe payment intent ${paymentIntent.id} failed.`,
    metadata: {
      paymentIntentId: paymentIntent.id,
      failureReason,
      providerResponseCode
    }
  });

  if (failedPayment.email) {
    await sendPaymentFailureEmailSafe({
      to: failedPayment.email,
      orderId: failedPayment.orderId,
      eventTitle: failedPayment.eventTitle,
      failureReason
    });
  }
}

export async function finalizeOrderPayment(
  paymentIntentId: string
): Promise<FinalizedOrderResult | null> {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: {
        paymentIntentId
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
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return null;
    }

    if (payment.status === "FAILED" || payment.order.status === "FAILED") {
      return null;
    }

    const orderEmail = payment.order.email ?? payment.order.user?.email ?? null;

    if (payment.status === "SUCCESS" && payment.order.status === "PAID") {
      return {
        status: "PAID",
        orderId: payment.order.id,
        eventId: payment.order.event.id,
        newlyPaid: false,
        email: orderEmail,
        ipAddress: payment.order.ipAddress
      };
    }

    if (payment.status === "SUCCESS" || payment.order.status === "PAID") {
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

      return {
        status: "PAID",
        orderId: payment.order.id,
        eventId: payment.order.event.id,
        newlyPaid: false,
        email: orderEmail,
        ipAddress: payment.order.ipAddress
      };
    }

    const canFulfill =
      payment.order.event.ticketingMode === "RESERVED"
        ? await fulfillReservedOrder(transaction, payment.order.id, payment.order.event.id)
        : await fulfillGAOrder(transaction, payment.order.id, payment.order.event.id);

    if (!canFulfill) {
      await markOrderAndPaymentFailed(transaction, payment.order.id, payment.id, {
        failureReason: "Inventory unavailable during finalization.",
        providerResponseCode: "INVENTORY_VALIDATION_FAILED"
      });

      return {
        status: "FAILED_INVENTORY",
        orderId: payment.order.id,
        eventId: payment.order.event.id,
        email: orderEmail,
        ipAddress: payment.order.ipAddress
      };
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

    return {
      status: "PAID",
      orderId: payment.order.id,
      eventId: payment.order.event.id,
      newlyPaid: true,
      email: orderEmail,
      ipAddress: payment.order.ipAddress
    };
  });
}

async function sendOrderConfirmationForOrder(
  orderId: string,
  fallbackTicketCount: number
): Promise<void> {
  const orderSummary = await getOrderEmailAndSummary(orderId);

  if (!orderSummary || !orderSummary.email) {
    return;
  }

  await sendOrderConfirmationEmailSafe({
    to: orderSummary.email,
    orderId,
    eventTitle: orderSummary.eventTitle,
    eventDate: orderSummary.eventDate,
    venueName: orderSummary.venueName,
    venueLocation: orderSummary.venueLocation,
    totalAmount: orderSummary.totalAmount,
    ticketCount: orderSummary.ticketCount || fallbackTicketCount
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
  paymentId: string,
  input: {
    failureReason: string;
    providerResponseCode?: string | null;
  }
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
      status: "FAILED",
      failureReason: input.failureReason.slice(0, 500),
      providerResponseCode: input.providerResponseCode ?? undefined
    }
  });
}
