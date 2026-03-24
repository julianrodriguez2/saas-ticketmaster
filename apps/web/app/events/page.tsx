"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EventCard } from "../../components/events/EventCard";
import { Skeleton } from "../../components/ui/Skeleton";
import { getEventsPage, type EventSummary } from "../../lib/events-api";

const PAGE_SIZE = 12;

export default function EventsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialVenue = searchParams.get("venue") ?? "";
  const initialDate = searchParams.get("date") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [venueInput, setVenueInput] = useState(initialVenue);
  const [dateInput, setDateInput] = useState(initialDate);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedFilters = useMemo(
    () => ({
      search: searchInput.trim(),
      venue: venueInput.trim(),
      date: dateInput.trim()
    }),
    [dateInput, searchInput, venueInput]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (normalizedFilters.search) {
        params.set("search", normalizedFilters.search);
      } else {
        params.delete("search");
      }

      if (normalizedFilters.date) {
        params.set("date", normalizedFilters.date);
      } else {
        params.delete("date");
      }

      if (normalizedFilters.venue) {
        params.set("venue", normalizedFilters.venue);
      } else {
        params.delete("venue");
      }

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) {
        return;
      }
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false
      });
      setPage(1);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [normalizedFilters, pathname, router, searchParams]);

  useEffect(() => {
    let isCancelled = false;

    async function loadEvents(nextPage: number, append: boolean): Promise<void> {
      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getEventsPage({
          search: normalizedFilters.search || undefined,
          venue: normalizedFilters.venue || undefined,
          date: normalizedFilters.date || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
          sortBy: "date",
          sortOrder: "asc"
        });

        if (isCancelled) {
          return;
        }

        setTotalPages(response.meta.totalPages || 1);
        setEvents((currentEvents) =>
          append ? [...currentEvents, ...response.data] : response.data
        );
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load events."
          );
          if (!append) {
            setEvents([]);
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    }

    void loadEvents(page, page > 1);

    return () => {
      isCancelled = true;
    };
  }, [normalizedFilters.date, normalizedFilters.search, normalizedFilters.venue, page]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Discover Events
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Search by title and filter by date. Results update quickly as you type.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="events-search"
            >
              Search
            </label>
            <input
              id="events-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Concert, sports, theater..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="events-venue"
            >
              Venue
            </label>
            <input
              id="events-venue"
              type="search"
              value={venueInput}
              onChange={(event) => setVenueInput(event.target.value)}
              placeholder="Venue name"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="events-date"
            >
              Starting Date
            </label>
            <input
              id="events-date"
              type="date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={`events-skeleton-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-6 h-4 w-28" />
              <Skeleton className="mt-5 h-9 w-28 rounded-lg" />
            </article>
          ))}
        </section>
      ) : events.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No events match the current filters.
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </section>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Page {Math.min(page, totalPages)} of {totalPages}
            </p>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={isFetchingMore || page >= totalPages}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingMore ? "Loading..." : page >= totalPages ? "End of Results" : "Load More"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
