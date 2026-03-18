import { prisma } from "@ticketing/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { SeatMapServiceError, validateSelection } from "../seatmaps/seatmap.service";
import {
  PaymentServiceError,
  createStripePaymentIntent,
  getStripeClient,
  recordStripePayment
} from "../payments/payment.service";

const createCheckoutSessionSchema = z
  .object({
    eventId: z.string().min(1),
    seatIds: z.array(z.string().min(1)).max(8).optional(),
    ticketTierId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().positive().max(20).optional(),
    email: z.string().trim().toLowerCase().email().optional()
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

export class CheckoutServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createCheckoutSession(
  input: unknown,
  userId?: string
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

  let totalAmount = 0;
  const orderItems: Array<{
    ticketTierId: string | null;
    seatId: string | null;
    quantity: number;
    price: number;
  }> = [];

  try {
    const validation = await validateSelection(
      payload.eventId,
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

      totalAmount = validation.totalPrice;

      for (const seat of validation.selectedSeats) {
        orderItems.push({
          ticketTierId: null,
          seatId: seat.id,
          quantity: 1,
          price: seat.price
        });
      }
    } else {
      if (!validation.valid || !validation.tier) {
        throw new CheckoutServiceError(
          409,
          validation.message ?? "Requested ticket quantity is unavailable."
        );
      }

      totalAmount = validation.totalPrice;
      orderItems.push({
        ticketTierId: validation.tier.id,
        seatId: null,
        quantity: validation.quantity,
        price: validation.tier.price
      });
    }
  } catch (error) {
    if (error instanceof SeatMapServiceError) {
      throw new CheckoutServiceError(error.statusCode, error.message);
    }

    if (error instanceof CheckoutServiceError) {
      throw error;
    }

    throw error;
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new CheckoutServiceError(400, "Checkout total must be greater than zero.");
  }

  let orderEmail: string | null = payload.email ?? null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        email: true
      }
    });

    orderEmail = user?.email ?? orderEmail;
  }

  const order = await prisma.$transaction(async (transaction) => {
    const createdOrder = await transaction.order.create({
      data: {
        userId,
        email: orderEmail,
        eventId: payload.eventId,
        totalAmount,
        status: "PENDING"
      }
    });

    await transaction.orderItem.createMany({
      data: orderItems.map((item) => ({
        orderId: createdOrder.id,
        ticketTierId: item.ticketTierId,
        seatId: item.seatId,
        quantity: item.quantity,
        price: item.price
      }))
    });

    return createdOrder;
  });

  const checkoutAttemptId = uuidv4();
  let paymentIntentId: string | null = null;

  try {
    const paymentIntent = await createStripePaymentIntent({
      orderId: order.id,
      eventId: payload.eventId,
      amountDollars: totalAmount,
      checkoutAttemptId
    });
    paymentIntentId = paymentIntent.id;

    if (!paymentIntent.client_secret) {
      await prisma.order.update({
        where: {
          id: order.id
        },
        data: {
          status: "FAILED"
        }
      });

      throw new CheckoutServiceError(500, "Stripe client secret was not returned.");
    }

    await recordStripePayment({
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
      amountDollars: totalAmount
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      totalAmount,
      currency: "usd"
    };
  } catch (error) {
    if (paymentIntentId) {
      await getStripeClient().paymentIntents
        .cancel(paymentIntentId)
        .catch(() => undefined);
    }

    await prisma.order.update({
      where: {
        id: order.id
      },
      data: {
        status: "FAILED"
      }
    });

    if (error instanceof CheckoutServiceError || error instanceof PaymentServiceError) {
      throw error;
    }

    throw new CheckoutServiceError(500, "Unable to initialize payment session.");
  }
}
