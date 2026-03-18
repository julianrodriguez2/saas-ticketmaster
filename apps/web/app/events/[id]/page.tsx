"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GATicketSelector } from "../../../components/events/GATicketSelector";
import { SeatLegend } from "../../../components/events/SeatLegend";
import {
  SeatMap,
  type SeatSelectionCandidate
} from "../../../components/events/SeatMap";
import { SelectedSeatsSummary } from "../../../components/events/SelectedSeatsSummary";
import {
  getAvailability,
  getEventById,
  getSeatMap,
  type AvailabilitySummary,
  type EventDetail,
  type PublicSeatMap,
  validateGASelection,
  validateReservedSelection
} from "../../../lib/events-api";

const MAX_SELECTED_SEATS = 8;

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = typeof params.id === "string" ? params.id : "";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [seatMap, setSeatMap] = useState<PublicSeatMap | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySummary | null>(null);
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, SeatSelectionCandidate>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedSeats = useMemo(
    () => Object.values(selectedSeatsMap),
    [selectedSeatsMap]
  );

  useEffect(() => {
    if (!eventId) {
      setError("Event not found.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadEventDetails(): Promise<void> {
      setError(null);
      setActionError(null);
      setIsLoading(true);

      try {
        const nextEvent = await getEventById(eventId);

        if (isCancelled) {
          return;
        }

        setEvent(nextEvent);

        if (nextEvent.ticketingMode === "RESERVED") {
          setIsSeatMapLoading(true);

          try {
            const [nextSeatMap, nextAvailability] = await Promise.all([
              getSeatMap(eventId),
              getAvailability(eventId)
            ]);

            if (!isCancelled) {
              setSeatMap(nextSeatMap);
              setAvailability(nextAvailability);
            }
          } finally {
            if (!isCancelled) {
              setIsSeatMapLoading(false);
            }
          }
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event details."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEventDetails();

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  function handleToggleSeat(candidate: SeatSelectionCandidate): void {
    setActionError(null);

    if (candidate.status !== "AVAILABLE") {
      return;
    }

    setSelectedSeatsMap((currentSelection) => {
      const nextSelection = { ...currentSelection };

      if (nextSelection[candidate.id]) {
        delete nextSelection[candidate.id];
        return nextSelection;
      }

      if (Object.keys(nextSelection).length >= MAX_SELECTED_SEATS) {
        setActionError(`You can select up to ${MAX_SELECTED_SEATS} seats.`);
        return currentSelection;
      }

      nextSelection[candidate.id] = candidate;
      return nextSelection;
    });
  }

  async function handleContinueReservedFlow(): Promise<void> {
    if (!event) {
      return;
    }

    if (selectedSeats.length === 0) {
      setActionError("Select at least one seat to continue.");
      return;
    }

    setActionError(null);
    setIsContinuing(true);

    try {
      const validation = await validateReservedSelection(
        event.id,
        selectedSeats.map((seat) => seat.id)
      );

      if (!validation.valid) {
        setSelectedSeatsMap((currentSelection) => {
          const nextSelection = { ...currentSelection };

          for (const invalidSeatId of validation.invalidSeatIds) {
            delete nextSelection[invalidSeatId];
          }

          return nextSelection;
        });

        setActionError("Some seats are no longer available. Please review your selection.");
        return;
      }

      const query = new URLSearchParams({
        eventId: event.id,
        seatIds: validation.selectedSeats.map((seat) => seat.id).join(",")
      });

      router.push(`/checkout?${query.toString()}`);
    } catch (validationError) {
      setActionError(
        validationError instanceof Error
          ? validationError.message
          : "Unable to validate seat selection."
      );
    } finally {
      setIsContinuing(false);
    }
  }

  async function handleContinueGAFlow(input: { tierId: string; quantity: number }): Promise<void> {
    if (!event) {
      return;
    }

    setActionError(null);
    setIsContinuing(true);

    try {
      const validation = await validateGASelection(event.id, input.tierId, input.quantity);

      if (!validation.valid) {
        setActionError(validation.message ?? "Selected quantity is not available.");
        return;
      }

      const query = new URLSearchParams({
        eventId: event.id,
        tierId: input.tierId,
        quantity: String(input.quantity)
      });

      router.push(`/checkout?${query.toString()}`);
    } catch (validationError) {
      setActionError(
        validationError instanceof Error
          ? validationError.message
          : "Unable to validate ticket selection."
      );
    } finally {
      setIsContinuing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading event details...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Event not found."}</p>
        <Link
          href="/events"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Events
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {new Date(event.date).toLocaleString()}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {event.title}
            </h1>
            <p className="mt-3 text-sm text-slate-700">{event.description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {event.ticketingMode}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Venue</p>
          <p className="mt-1 text-sm text-slate-700">
            {event.venue.name} - {event.venue.location}
          </p>
        </div>
      </section>

      {actionError ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{actionError}</p>
        </section>
      ) : null}

      {event.ticketingMode === "GA" ? (
        <GATicketSelector
          ticketTiers={event.ticketTiers}
          isSubmitting={isContinuing}
          onContinue={handleContinueGAFlow}
        />
      ) : isSeatMapLoading ? (
        <p className="text-sm text-slate-600">Loading seat map...</p>
      ) : !seatMap || seatMap.sections.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Seat map is not configured for this event yet.</p>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Select Seats</h2>
              <p className="mt-2 text-sm text-slate-600">
                Choose up to {MAX_SELECTED_SEATS} seats, then continue to checkout.
              </p>

              <div className="mt-4">
                <SeatLegend />
              </div>

              <div className="mt-4">
                <SeatMap
                  sections={seatMap.sections}
                  selectedSeatIds={selectedSeats.map((seat) => seat.id)}
                  onToggleSeat={handleToggleSeat}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SelectedSeatsSummary seats={selectedSeats} />

            {availability ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Availability
                </h3>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li>Available: {availability.availableSeats}</li>
                  <li>Reserved: {availability.reservedSeats}</li>
                  <li>Sold: {availability.soldSeats}</li>
                  <li>Blocked: {availability.blockedSeats}</li>
                </ul>
              </section>
            ) : null}

            <button
              type="button"
              onClick={() => void handleContinueReservedFlow()}
              disabled={isContinuing || selectedSeats.length === 0}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isContinuing ? "Validating..." : "Continue to Checkout"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}