"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventForm } from "../../components/admin/EventForm";
import { VenueForm } from "../../components/admin/VenueForm";
import {
  getEvents,
  getVenues,
  type AdminEventSummary,
  type Venue
} from "../../lib/admin-api";
import { useAuth } from "../../lib/auth-context";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const [venuesResponse, eventsResponse] = await Promise.all([
        getVenues(),
        getEvents()
      ]);

      setVenues(venuesResponse);
      setEvents(eventsResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dashboard data."
      );
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      setIsPageLoading(false);
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      setIsPageLoading(false);
      router.replace("/");
      return;
    }

    void loadDashboardData();
  }, [isLoading, user, router, loadDashboardData]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
    [events]
  );

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading admin dashboard...</p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage venues and publish events with ticket pricing tiers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEventForm((currentValue) => !currentValue)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {showEventForm ? "Close Event Form" : "Create Event"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <VenueForm onCreated={loadDashboardData} />
        {showEventForm ? (
          <EventForm venues={venues} onCreated={loadDashboardData} />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Event form is hidden. Click "Create Event" to open it.
            </p>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Existing Events</h2>

        {sortedEvents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No events created yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sortedEvents.map((event) => (
              <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {event.ticketingMode}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {new Date(event.date).toLocaleString()} at {event.venue.name} ({event.venue.location})
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Starting price:{" "}
                  {event.lowestTicketPrice === null
                    ? "TBA"
                    : `$${event.lowestTicketPrice.toFixed(2)}`}
                </p>
                {event.ticketingMode === "RESERVED" ? (
                  <Link
                    href={`/admin/events/${event.id}/seat-map`}
                    className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Configure Seat Map
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
