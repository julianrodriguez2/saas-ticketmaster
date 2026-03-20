"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckoutSummary, type CheckoutSummaryData } from "../../components/checkout/CheckoutSummary";
import { PaymentForm } from "../../components/checkout/PaymentForm";
import {
  createCheckoutSession,
  type CheckoutSession,
  type CreateCheckoutSessionInput
} from "../../lib/checkout-api";
import { useAuth } from "../../lib/auth-context";
import {
  getEventById,
  validateGASelection,
  validateReservedSelection,
  type EventDetail
} from "../../lib/events-api";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type CheckoutSelectionPayload =
  | {
      eventId: string;
      seatIds: string[];
      presaleCode?: string;
      presaleLinkAccess?: boolean;
    }
  | {
      eventId: string;
      ticketTierId: string;
      quantity: number;
      presaleCode?: string;
      presaleLinkAccess?: boolean;
    };

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [summary, setSummary] = useState<CheckoutSummaryData | null>(null);
  const [selectionPayload, setSelectionPayload] = useState<CheckoutSelectionPayload | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const eventId = searchParams.get("eventId") ?? "";
  const seatIds = searchParams.get("seatIds");
  const ticketTierId = searchParams.get("tierId");
  const quantityParam = searchParams.get("quantity");
  const presaleCode = searchParams.get("presaleCode") ?? "";
  const presaleLinkAccessParam = searchParams.get("presaleLinkAccess");
  const presaleLinkAccess =
    presaleLinkAccessParam === "1" || presaleLinkAccessParam === "true";

  const retryQuery = useMemo(() => searchParams.toString(), [searchParams]);
  const cancelRedirectPath = useMemo(
    () =>
      retryQuery
        ? `/checkout/cancel?retry=${encodeURIComponent(retryQuery)}`
        : "/checkout/cancel",
    [retryQuery]
  );

  const initializeSession = useCallback(
    async (email?: string): Promise<void> => {
      if (!selectionPayload || session || isCreatingSession) {
        return;
      }

      setSessionError(null);
      setIsCreatingSession(true);

      try {
        const payload: CreateCheckoutSessionInput = email
          ? {
              ...selectionPayload,
              email
            }
          : selectionPayload;

        const nextSession = await createCheckoutSession(payload);
        setSession(nextSession);
      } catch (sessionError) {
        setSessionError(
          sessionError instanceof Error
            ? sessionError.message
            : "Unable to initialize payment session."
        );
      } finally {
        setIsCreatingSession(false);
      }
    },
    [isCreatingSession, selectionPayload, session]
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

    async function loadCheckoutContext(): Promise<void> {
      setIsLoading(true);
      setError(null);
      setSessionError(null);
      setSession(null);

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

          if (!isCancelled) {
            setSummary({
              mode: "RESERVED",
              seats: validation.selectedSeats,
              totalAmount: validation.totalPrice
            });
            setSelectionPayload({
              eventId: eventDetail.id,
              seatIds: parsedSeatIds,
              presaleCode: presaleCode || undefined,
              presaleLinkAccess
            });
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

        if (!isCancelled) {
          setSummary({
            mode: "GA",
            tierId: validation.tier.id,
            tierName: validation.tier.name,
            quantity: validation.quantity,
            unitPrice: validation.tier.price,
            totalAmount: validation.totalPrice
          });
            setSelectionPayload({
              eventId: eventDetail.id,
              ticketTierId: validation.tier.id,
              quantity: validation.quantity,
              presaleCode: presaleCode || undefined,
              presaleLinkAccess
            });
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

    void loadCheckoutContext();

    return () => {
      isCancelled = true;
    };
  }, [eventId, presaleCode, presaleLinkAccess, quantityParam, seatIds, ticketTierId]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user && selectionPayload && !session && !isCreatingSession) {
      void initializeSession();
    }
  }, [initializeSession, isAuthLoading, isCreatingSession, selectionPayload, session, user]);

  if (isLoading || isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Preparing secure checkout...</p>
      </main>
    );
  }

  if (error || !event || !summary || !selectionPayload) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Checkout setup failed."}</p>
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

        {session ? (
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
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Payment Setup</h2>
            {user ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-600">Initializing payment session...</p>
                {sessionError ? <p className="text-sm text-rose-600">{sessionError}</p> : null}
                {sessionError ? (
                  <button
                    type="button"
                    onClick={() => {
                      void initializeSession();
                    }}
                    disabled={isCreatingSession}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Retry Setup
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Enter your email to continue as a guest and receive confirmation.
                </p>
                <label className="block text-sm font-medium text-slate-700" htmlFor="guest-email">
                  Email
                </label>
                <input
                  id="guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    void initializeSession(guestEmail.trim().toLowerCase());
                  }}
                  disabled={isCreatingSession || !guestEmail.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingSession ? "Initializing..." : "Continue to Payment"}
                </button>
                {sessionError ? <p className="text-sm text-rose-600">{sessionError}</p> : null}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
