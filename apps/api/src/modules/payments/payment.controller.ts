import type { NextFunction, Request, Response } from "express";
import type Stripe from "stripe";
import {
  PaymentServiceError,
  getStripeClient,
  getStripeWebhookSecret,
  handleStripePaymentIntentFailed,
  handleStripePaymentIntentSucceeded
} from "./payment.service";

export async function stripeWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    res.status(400).json({ message: "Missing Stripe signature header." });
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ message: "Invalid Stripe webhook payload." });
    return;
  }

  try {
    const event = getStripeClient().webhooks.constructEvent(
      req.body,
      signature,
      getStripeWebhookSecret()
    );

    if (event.type === "payment_intent.succeeded") {
      await handleStripePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
    }

    if (event.type === "payment_intent.payment_failed") {
      await handleStripePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      (error as { type?: string }).type === "StripeSignatureVerificationError"
    ) {
      res.status(400).json({ message: "Invalid Stripe webhook signature." });
      return;
    }

    if (error instanceof PaymentServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
