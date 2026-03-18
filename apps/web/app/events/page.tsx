"use client";

import { useEffect, useState } from "react";
import { EventCard } from "../../components/events/EventCard";
import { getEvents, type EventSummary } from "../../lib/events-api";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const timeoutId = setTimeout(async () => {
      setError(null);
      setIsLoading(true);

      try {
        const nextEvents = await getEvents({ search });

        if (!isCancelled) {
          setEvents(nextEvents);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load events."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">All Events</h1>
        <p className="mt-2 text-sm text-slate-600">
          Find the next event you want to attend.
        </p>

        <div className="mt-4 max-w-lg">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="events-search">
            Search by title
          </label>
          <input
            id="events-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : isLoading ? (
        <p className="text-sm text-slate-600">Loading events...</p>
      ) : events.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">No events match your search.</p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </main>
  );
}
