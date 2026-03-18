"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventCard } from "../../components/events/EventCard";
import { useAuth } from "../../lib/auth-context";
import {
  getEvents,
  getRecommendedEvents,
  type EventSummary
} from "../../lib/events-api";

export default function HomePage() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<EventSummary[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadRecommendedEvents = useCallback(async (): Promise<void> => {
    setRecommendedError(null);
    setIsRecommendedLoading(true);

    try {
      const nextEvents = await getRecommendedEvents();
      setRecommendedEvents(nextEvents);
    } catch (error) {
      setRecommendedError(
        error instanceof Error
          ? error.message
          : "Unable to load upcoming events."
      );
    } finally {
      setIsRecommendedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecommendedEvents();
  }, [loadRecommendedEvents]);

  useEffect(() => {
    let isCancelled = false;

    const timeoutId = setTimeout(async () => {
      setEventsError(null);
      setIsEventsLoading(true);

      try {
        const nextEvents = await getEvents({ search });

        if (!isCancelled) {
          setEvents(nextEvents);
        }
      } catch (error) {
        if (!isCancelled) {
          setEventsError(
            error instanceof Error
              ? error.message
              : "Unable to load events."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsEventsLoading(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search]);

  async function handleLogout(): Promise<void> {
    setAuthError(null);
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to log out.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Ticketing Platform
        </Link>

        {isAuthLoading ? (
          <p className="text-sm text-slate-500">Loading account...</p>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-700">{user.email}</p>
            {user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Register
            </Link>
          </div>
        )}
      </header>

      {authError ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-600">{authError}</p>
        </section>
      ) : null}

      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">
          Live Experiences
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Discover Live Events
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
          Explore concerts, sports, and theater shows near you. Browse upcoming events and choose the best ticket tier.
        </p>

        <div className="mt-6 max-w-xl">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-300" htmlFor="event-search">
            Search Events
          </label>
          <input
            id="event-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title"
            className="mt-2 w-full rounded-xl border border-slate-500 bg-slate-800/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Browse Events</h2>
          <Link
            href="/events"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            View All Events
          </Link>
        </div>

        {eventsError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-600">{eventsError}</p>
          </div>
        ) : isEventsLoading ? (
          <p className="text-sm text-slate-600">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">No events found for that search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Upcoming Events</h2>
        <p className="mt-2 text-sm text-slate-600">Trending picks sorted by nearest date.</p>

        {recommendedError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-600">{recommendedError}</p>
          </div>
        ) : isRecommendedLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading recommendations...</p>
        ) : recommendedEvents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">No upcoming events available.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
