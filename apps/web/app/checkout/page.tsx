"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckoutSummary, type CheckoutSummaryData } from "../../components/checkout/CheckoutSummary";
import { PaymentForm } from "../../components/checkout/PaymentForm";
import {
  createCheckoutSession,
  type CheckoutSession
} from "../../lib/checkout-api";
import {
  getEventById,
  validateGASelection,
  validateReservedSelection,
  type EventDetail
} from "../../lib/events-api";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [summary, setSummary] = useState<CheckoutSummaryData | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventId = searchParams.get("eventId") ?? "";
  const seatIds = searchParams.get("seatIds");
  const ticketTierId = searchParams.get("tierId");
  const quantityParam = searchParams.get("quantity");

  const retryQuery = useMemo(() => searchParams.toString(), [searchParams]);
  const cancelRedirectPath = useMemo(
    () =>
      retryQuery
        ? `/checkout/cancel?retry=${encodeURIComponent(retryQuery)}`
        : "/checkout/cancel",
    [retryQuery]
  );

  useEffect(() => {
    if (!stripePublishableKey) {
      setError("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.");
      setIsLoading(false);
      return;
    }

    if (!eventId) {
      setError("Missing event selection. Start checkout from an event page.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function initializeCheckout(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const eventDetail = await getEventById(eventId);

        if (isCancelled) {
          return;
        }

        setEvent(eventDetail);

        if (eventDetail.ticketingMode === "RESERVED") {
          const parsedSeatIds = (seatIds ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

          if (parsedSeatIds.length === 0) {
            throw new Error("No seats were selected for checkout.");
          }

          const validation = await validateReservedSelection(eventDetail.id, parsedSeatIds);

          if (!validation.valid || validation.selectedSeats.length === 0) {
            throw new Error("Selected seats are no longer available.");
          }

          const nextSummary: CheckoutSummaryData = {
            mode: "RESERVED",
            seats: validation.selectedSeats,
            totalAmount: validation.totalPrice
          };

          const nextSession = await createCheckoutSession({
            eventId: eventDetail.id,
            seatIds: parsedSeatIds
          });

          if (!isCancelled) {
            setSummary(nextSummary);
            setSession(nextSession);
          }

          return;
        }

        if (!ticketTierId || !quantityParam) {
          throw new Error("Missing GA ticket tier or quantity for checkout.");
        }

        const quantity = Number(quantityParam);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Invalid GA ticket quantity.");
        }

        const validation = await validateGASelection(eventDetail.id, ticketTierId, quantity);

        if (!validation.valid || !validation.tier) {
          throw new Error(validation.message ?? "Selected GA quantity is unavailable.");
        }

        const nextSummary: CheckoutSummaryData = {
          mode: "GA",
          tierId: validation.tier.id,
          tierName: validation.tier.name,
          quantity: validation.quantity,
          unitPrice: validation.tier.price,
          totalAmount: validation.totalPrice
        };

        const nextSession = await createCheckoutSession({
          eventId: eventDetail.id,
          ticketTierId: validation.tier.id,
          quantity: validation.quantity
        });

        if (!isCancelled) {
          setSummary(nextSummary);
          setSession(nextSession);
        }
      } catch (checkoutError) {
        if (!isCancelled) {
          setError(
            checkoutError instanceof Error
              ? checkoutError.message
              : "Unable to initialize checkout."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeCheckout();

    return () => {
      isCancelled = true;
    };
  }, [eventId, quantityParam, seatIds, ticketTierId]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Preparing secure checkout...</p>
      </main>
    );
  }

  if (error || !event || !summary || !session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Checkout session could not be created."}</p>
        <Link
          href="/events"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Events
        </Link>
      </main>
    );
  }

  if (!stripePromise) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Checkout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confirm your selection and complete payment securely via Stripe.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CheckoutSummary
          event={{
            title: event.title,
            date: event.date,
            venue: {
              name: event.venue.name,
              location: event.venue.location
            }
          }}
          summary={summary}
        />

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: session.clientSecret
          }}
        >
          <PaymentForm
            clientSecret={session.clientSecret}
            orderId={session.orderId}
            cancelRedirectPath={cancelRedirectPath}
          />
        </Elements>
      </div>
    </main>
  );
}
