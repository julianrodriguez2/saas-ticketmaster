"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SeatMapBuilder } from "../../../../../components/admin/SeatMapBuilder";
import { getEventById, type AdminEventDetail } from "../../../../../lib/admin-api";
import { useAuth } from "../../../../../lib/auth-context";

export default function AdminEventSeatMapPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading } = useAuth();

  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (!eventId) {
      setError("Event not found.");
      setIsPageLoading(false);
      return;
    }

    async function loadEvent(): Promise<void> {
      setError(null);

      try {
        const nextEvent = await getEventById(eventId);
        setEvent(nextEvent);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load event."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadEvent();
  }, [eventId, isLoading, router, user]);

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading seat map builder...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Event not found."}</p>
        <Link
          href="/admin"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Admin Dashboard
        </Link>
      </main>
    );
  }

  if (event.ticketingMode !== "RESERVED") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-20">
        <h1 className="text-2xl font-semibold text-slate-900">Seat Map Builder</h1>
        <p className="text-sm text-slate-700">
          This event is configured as GA. Switch to RESERVED mode to configure a seat map.
        </p>
        <Link
          href="/admin"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Admin Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reserved Event</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {event.title} - Seat Map
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Build sections, rows, and seat pricing for this event.
        </p>
      </section>

      <SeatMapBuilder eventId={event.id} />
    </main>
  );
}
