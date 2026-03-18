"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById, type EventDetail } from "../../../lib/events-api";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params.id === "string" ? params.id : "";
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError("Event not found.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadEventDetails(): Promise<void> {
      setError(null);
      setIsLoading(true);

      try {
        const nextEvent = await getEventById(eventId);

        if (!isCancelled) {
          setEvent(nextEvent);
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {new Date(event.date).toLocaleString()}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {event.title}
        </h1>
        <p className="mt-3 text-sm text-slate-700">{event.description}</p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Venue</p>
          <p className="mt-1 text-sm text-slate-700">
            {event.venue.name} - {event.venue.location}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ticket Tiers</h2>

        {event.ticketTiers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Ticket tiers will be announced soon.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {event.ticketTiers.map((tier) => (
              <article key={tier.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                    <p className="text-sm text-slate-600">
                      ${tier.price.toFixed(2)} - {tier.quantityRemaining} available
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Buy Ticket
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
