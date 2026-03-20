import type { NextFunction, Request, Response } from "express";
import type Stripe from "stripe";
import { createAdminNotificationSafe } from "../admin-notifications/adminNotification.service";
import { recordSystemEventSafe } from "../system-events/systemEvent.service";
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
      await createAdminNotificationSafe({
        type: "WEBHOOK_SIGNATURE_FAILED",
        severity: "CRITICAL",
        title: "Stripe webhook signature verification failed",
        message: "A Stripe webhook request failed signature verification.",
        dedupeKey: `stripe-signature-failed:${new Date().toISOString().slice(0, 13)}`
      });

      await recordSystemEventSafe({
        type: "WEBHOOK_SIGNATURE_FAILED",
        entityType: "PAYMENT_WEBHOOK",
        entityId: "stripe",
        message: "Stripe webhook signature verification failed."
      });

      res.status(400).json({ message: "Invalid Stripe webhook signature." });
      return;
    }

    if (error instanceof PaymentServiceError) {
      await createAdminNotificationSafe({
        type: "WEBHOOK_PROCESSING_FAILED",
        severity: "CRITICAL",
        title: "Stripe webhook processing failed",
        message: error.message,
        dedupeKey: `stripe-webhook-service-error:${new Date().toISOString().slice(0, 13)}`
      });

      await recordSystemEventSafe({
        type: "WEBHOOK_PROCESSING_FAILED",
        entityType: "PAYMENT_WEBHOOK",
        entityId: "stripe",
        message: "Stripe webhook processing failed with service error.",
        metadata: {
          errorMessage: error.message,
          statusCode: error.statusCode
        }
      });

      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    await createAdminNotificationSafe({
      type: "WEBHOOK_PROCESSING_FAILED",
      severity: "CRITICAL",
      title: "Stripe webhook processing failed",
      message: "Unexpected Stripe webhook processing error.",
      dedupeKey: `stripe-webhook-error:${new Date().toISOString().slice(0, 13)}`
    });

    await recordSystemEventSafe({
      type: "WEBHOOK_PROCESSING_FAILED",
      entityType: "PAYMENT_WEBHOOK",
      entityId: "stripe",
      message: "Unexpected Stripe webhook processing error.",
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });

    next(error);
  }
}
