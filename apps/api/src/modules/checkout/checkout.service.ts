import { prisma } from "@ticketing/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { createAdminNotificationSafe } from "../admin-notifications/adminNotification.service";
import {
  FraudServiceError,
  applyOrderRiskAssessment,
  enforceMaxTicketsPerOrder,
  evaluateCheckoutRisk,
  trackPaymentAttempt
} from "../fraud/fraud.service";
import {
  PaymentServiceError,
  createStripePaymentIntent,
  getStripeClient,
  recordStripePayment
} from "../payments/payment.service";
import {
  PresaleServiceError,
  validatePresaleAccess
} from "../presales/presale.service";
import { SeatMapServiceError, validateSelection } from "../seatmaps/seatmap.service";
import { recordSystemEvent, recordSystemEventSafe } from "../system-events/systemEvent.service";

const createCheckoutSessionSchema = z
  .object({
    eventId: z.string().min(1),
    seatIds: z.array(z.string().min(1)).max(20).optional(),
    ticketTierId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().positive().max(50).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    presaleCode: z.string().trim().max(120).optional(),
    presaleLinkAccess: z.coerce.boolean().optional()
  })
  .superRefine((data, context) => {
    const hasSeatSelection = Array.isArray(data.seatIds) && data.seatIds.length > 0;
    const hasGASelection = Boolean(data.ticketTierId) && typeof data.quantity === "number";

    if (hasSeatSelection === hasGASelection) {
      context.addIssue({
        code: "custom",
        message:
          "Provide either seatIds for reserved seating, or ticketTierId and quantity for GA."
      });
    }
  });

type ClientRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

type CheckoutOrderItem = {
  ticketTierId: string | null;
  seatId: string | null;
  quantity: number;
  price: number;
};

type ReservedSelection = {
  mode: "RESERVED";
  seatIds: string[];
  ticketCount: number;
  totalAmount: number;
  orderItems: CheckoutOrderItem[];
};

type GASelection = {
  mode: "GA";
  tierId: string;
  quantity: number;
  ticketCount: number;
  totalAmount: number;
  orderItems: CheckoutOrderItem[];
};

type ResolvedSelection = ReservedSelection | GASelection;

export class CheckoutServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createCheckoutSession(
  input: unknown,
  userId?: string,
  clientContext?: ClientRequestContext
): Promise<{
  clientSecret: string;
  orderId: string;
  totalAmount: number;
  currency: "usd";
}> {
  const parsedPayload = createCheckoutSessionSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new CheckoutServiceError(
      400,
      parsedPayload.error.issues[0]?.message ?? "Invalid checkout payload."
    );
  }

  const payload = parsedPayload.data;

  if (!userId && !payload.email) {
    throw new CheckoutServiceError(400, "Email is required for guest checkout.");
  }

  const ipAddress = normalizeIpAddress(clientContext?.ipAddress ?? null);
  const userAgent = normalizeUserAgent(clientContext?.userAgent ?? null);
  const orderEmail = await resolveOrderEmail({
    userId: userId ?? null,
    payloadEmail: payload.email ?? null
  });

  let presaleValidation: Awaited<ReturnType<typeof validatePresaleAccess>>;

  try {
    presaleValidation = await validatePresaleAccess(payload.eventId, {
      code: payload.presaleCode,
      linkAccess: payload.presaleLinkAccess
    });
  } catch (error) {
    if (error instanceof PresaleServiceError) {
      throw new CheckoutServiceError(error.statusCode, error.message);
    }

    throw error;
  }

  if (!presaleValidation.accessGranted) {
    const denialReason =
      presaleValidation.reason ?? "Presale access is required for this event.";

    await handleCheckoutBlocked({
      eventId: payload.eventId,
      email: orderEmail,
      ipAddress,
      reason: denialReason,
      type: "CHECKOUT_BLOCKED_PRESALE"
    });

    throw new CheckoutServiceError(403, denialReason);
  }

  const selection = await resolveSelection(payload.eventId, payload);

  if (!Number.isFinite(selection.totalAmount) || selection.totalAmount <= 0) {
    throw new CheckoutServiceError(400, "Checkout total must be greater than zero.");
  }

  try {
    enforceMaxTicketsPerOrder(selection.ticketCount);
  } catch (error) {
    if (error instanceof FraudServiceError) {
      await handleCheckoutBlocked({
        eventId: payload.eventId,
        email: orderEmail,
        ipAddress,
        reason: error.message,
        type: "CHECKOUT_BLOCKED_MAX_TICKETS"
      });
      throw new CheckoutServiceError(error.statusCode, error.message);
    }

    throw error;
  }

  await revalidateSelectionBeforePayment({
    eventId: payload.eventId,
    selection,
    email: orderEmail,
    ipAddress
  });

  const riskAssessment = await evaluateCheckoutRisk({
    orderTotalAmount: selection.totalAmount,
    ticketCount: selection.ticketCount,
    email: orderEmail,
    ipAddress,
    eventId: payload.eventId,
    isGuestCheckout: !userId
  });

  if (riskAssessment.shouldBlock) {
    await handleCheckoutBlocked({
      eventId: payload.eventId,
      email: orderEmail,
      ipAddress,
      reason: riskAssessment.blockReason ?? "Checkout blocked by risk safeguards.",
      type: "CHECKOUT_BLOCKED_RISK"
    });
    throw new CheckoutServiceError(
      409,
      riskAssessment.blockReason ?? "Checkout blocked by operational safeguards."
    );
  }

  const order = await prisma.$transaction(async (transaction) => {
    const createdOrder = await transaction.order.create({
      data: {
        userId,
        email: orderEmail,
        eventId: payload.eventId,
        totalAmount: selection.totalAmount,
        status: "PENDING"
      }
    });

    await transaction.orderItem.createMany({
      data: selection.orderItems.map((item) => ({
        orderId: createdOrder.id,
        ticketTierId: item.ticketTierId,
        seatId: item.seatId,
        quantity: item.quantity,
        price: item.price
      }))
    });

    await recordSystemEvent(
      {
        type: "ORDER_CREATED",
        entityType: "ORDER",
        entityId: createdOrder.id,
        message: `Order ${createdOrder.id} created in pending state.`,
        metadata: {
          eventId: payload.eventId,
          ticketCount: selection.ticketCount,
          totalAmount: selection.totalAmount,
          mode: selection.mode
        }
      },
      transaction
    );

    return createdOrder;
  });

  await applyOrderRiskAssessment({
    orderId: order.id,
    eventId: payload.eventId,
    orderTotalAmount: selection.totalAmount,
    riskAssessment,
    email: orderEmail,
    ipAddress,
    userAgent
  });

  await trackPaymentAttempt({
    email: orderEmail,
    ipAddress,
    eventId: payload.eventId,
    status: "STARTED",
    reason: "Checkout session initialized."
  });

  const checkoutAttemptId = uuidv4();
  let paymentIntentId: string | null = null;

  try {
    const paymentIntent = await createStripePaymentIntent({
      orderId: order.id,
      eventId: payload.eventId,
      amountDollars: selection.totalAmount,
      checkoutAttemptId
    });
    paymentIntentId = paymentIntent.id;

    if (!paymentIntent.client_secret) {
      throw new CheckoutServiceError(500, "Stripe client secret was not returned.");
    }

    await recordStripePayment({
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
      amountDollars: selection.totalAmount
    });

    await recordSystemEventSafe({
      type: "PAYMENT_INTENT_CREATED",
      entityType: "ORDER",
      entityId: order.id,
      message: `Payment intent ${paymentIntent.id} created.`,
      metadata: {
        paymentIntentId: paymentIntent.id
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      totalAmount: selection.totalAmount,
      currency: "usd"
    };
  } catch (error) {
    if (paymentIntentId) {
      await getStripeClient().paymentIntents.cancel(paymentIntentId).catch(() => undefined);
    }

    await prisma.order.update({
      where: {
        id: order.id
      },
      data: {
        status: "FAILED"
      }
    });

    await trackPaymentAttempt({
      email: orderEmail,
      ipAddress,
      eventId: payload.eventId,
      status: "FAILED",
      reason: error instanceof Error ? error.message.slice(0, 280) : "Payment intent creation failed."
    });

    await recordSystemEventSafe({
      type: "PAYMENT_INTENT_CREATION_FAILED",
      entityType: "ORDER",
      entityId: order.id,
      message: "Stripe payment intent initialization failed.",
      metadata: {
        reason: error instanceof Error ? error.message : "Unknown error"
      }
    });

    if (error instanceof CheckoutServiceError || error instanceof PaymentServiceError) {
      throw error;
    }

    throw new CheckoutServiceError(500, "Unable to initialize payment session.");
  }
}

async function resolveOrderEmail(input: {
  userId: string | null;
  payloadEmail: string | null;
}): Promise<string | null> {
  if (!input.userId) {
    return input.payloadEmail;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    },
    select: {
      email: true
    }
  });

  return user?.email ?? input.payloadEmail;
}

async function resolveSelection(
  eventId: string,
  payload: z.infer<typeof createCheckoutSessionSchema>
): Promise<ResolvedSelection> {
  try {
    const validation = await validateSelection(
      eventId,
      payload.seatIds
        ? { seatIds: payload.seatIds }
        : {
            tierId: payload.ticketTierId,
            quantity: payload.quantity
          }
    );

    if (validation.mode === "RESERVED") {
      if (!validation.valid || validation.selectedSeats.length === 0) {
        throw new CheckoutServiceError(409, "One or more selected seats are unavailable.");
      }

      return {
        mode: "RESERVED",
        seatIds: validation.selectedSeats.map((seat) => seat.id),
        ticketCount: validation.selectedSeats.length,
        totalAmount: validation.totalPrice,
        orderItems: validation.selectedSeats.map((seat) => ({
          ticketTierId: null,
          seatId: seat.id,
          quantity: 1,
          price: seat.price
        }))
      };
    }

    if (!validation.valid || !validation.tier) {
      throw new CheckoutServiceError(
        409,
        validation.message ?? "Requested ticket quantity is unavailable."
      );
    }

    return {
      mode: "GA",
      tierId: validation.tier.id,
      quantity: validation.quantity,
      ticketCount: validation.quantity,
      totalAmount: validation.totalPrice,
      orderItems: [
        {
          ticketTierId: validation.tier.id,
          seatId: null,
          quantity: validation.quantity,
          price: validation.tier.price
        }
      ]
    };
  } catch (error) {
    if (error instanceof SeatMapServiceError) {
      throw new CheckoutServiceError(error.statusCode, error.message);
    }

    if (error instanceof CheckoutServiceError) {
      throw error;
    }

    throw error;
  }
}

async function revalidateSelectionBeforePayment(input: {
  eventId: string;
  selection: ResolvedSelection;
  email: string | null;
  ipAddress: string | null;
}): Promise<void> {
  let validation: Awaited<ReturnType<typeof validateSelection>>;

  try {
    validation = await validateSelection(
      input.eventId,
      input.selection.mode === "RESERVED"
        ? { seatIds: input.selection.seatIds }
        : {
            tierId: input.selection.tierId,
            quantity: input.selection.quantity
          }
    );
  } catch (error) {
    if (error instanceof SeatMapServiceError) {
      throw new CheckoutServiceError(error.statusCode, error.message);
    }

    throw error;
  }

  let isValid = false;

  if (input.selection.mode === "RESERVED" && validation.mode === "RESERVED") {
    const sameSeatCount = validation.selectedSeats.length === input.selection.seatIds.length;
    isValid = validation.valid && sameSeatCount;
  }

  if (input.selection.mode === "GA" && validation.mode === "GA") {
    isValid = validation.valid && Boolean(validation.tier);
  }

  if (!isValid) {
    await emitInventoryValidationFailure({
      eventId: input.eventId,
      selectionMode: input.selection.mode,
      email: input.email,
      ipAddress: input.ipAddress
    });
    throw new CheckoutServiceError(
      409,
      "Inventory changed while preparing checkout. Please review your selection and try again."
    );
  }
}

async function emitInventoryValidationFailure(input: {
  eventId: string;
  selectionMode: "GA" | "RESERVED";
  email: string | null;
  ipAddress: string | null;
}): Promise<void> {
  await trackPaymentAttempt({
    email: input.email,
    ipAddress: input.ipAddress,
    eventId: input.eventId,
    status: "BLOCKED",
    reason: "Inventory revalidation failed before payment."
  });

  await createAdminNotificationSafe({
    type: "INVENTORY_MISMATCH",
    severity: "CRITICAL",
    title: "Inventory mismatch blocked checkout",
    message: `Checkout blocked for ${input.selectionMode} order due to inventory mismatch.`,
    relatedEventId: input.eventId,
    dedupeKey: `inventory-mismatch:${input.eventId}:${input.selectionMode}:${new Date().toISOString().slice(0, 13)}`
  });

  await recordSystemEventSafe({
    type: "INVENTORY_VALIDATION_FAILED",
    entityType: "EVENT",
    entityId: input.eventId,
    message: "Inventory validation failed during checkout initialization.",
    metadata: {
      selectionMode: input.selectionMode
    }
  });
}

async function handleCheckoutBlocked(input: {
  eventId: string;
  email: string | null;
  ipAddress: string | null;
  reason: string;
  type:
    | "CHECKOUT_BLOCKED_MAX_TICKETS"
    | "CHECKOUT_BLOCKED_RISK"
    | "CHECKOUT_BLOCKED_PRESALE";
}): Promise<void> {
  await trackPaymentAttempt({
    email: input.email,
    ipAddress: input.ipAddress,
    eventId: input.eventId,
    status: "BLOCKED",
    reason: input.reason
  });

  await createAdminNotificationSafe({
    type: input.type,
    severity: "WARNING",
    title: "Checkout attempt blocked",
    message: input.reason,
    relatedEventId: input.eventId,
    dedupeKey: `${input.type}:${input.eventId}:${new Date().toISOString().slice(0, 13)}`
  });

  await recordSystemEventSafe({
    type: input.type,
    entityType: "EVENT",
    entityId: input.eventId,
    message: input.reason
  });
}

function normalizeIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) {
    return null;
  }

  const trimmedIpAddress = ipAddress.trim();
  return trimmedIpAddress ? trimmedIpAddress.slice(0, 120) : null;
}

function normalizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  const trimmedUserAgent = userAgent.trim();
  return trimmedUserAgent ? trimmedUserAgent.slice(0, 500) : null;
}
