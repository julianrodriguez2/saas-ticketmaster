"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminOrderTable } from "../../../../components/admin/orders/AdminOrderTable";
import {
  getEvents,
  getFlaggedAdminOrders,
  type AdminEventSummary,
  type AdminOrderListResponse,
  type RiskLevel
} from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

const EMPTY_ORDER_RESULT: AdminOrderListResponse = {
  orders: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
};

export default function FlaggedAdminOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [orders, setOrders] = useState<AdminOrderListResponse>(EMPTY_ORDER_RESULT);
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<Extract<RiskLevel, "MEDIUM" | "HIGH"> | "">("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, selectedEventId, selectedRiskLevel]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      setIsLoading(false);
      router.replace("/");
      return;
    }

    async function loadEventOptions(): Promise<void> {
      try {
        const nextEvents = await getEvents();
        setEvents(nextEvents);
      } catch {
        setEvents([]);
      }
    }

    void loadEventOptions();
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user || user.role !== "ADMIN") {
      return;
    }

    let isCancelled = false;

    async function loadOrders(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const nextOrders = await getFlaggedAdminOrders({
          page,
          limit: 20,
          search: search || undefined,
          eventId: selectedEventId || undefined,
          riskLevel: selectedRiskLevel || undefined
        });

        if (!isCancelled) {
          setOrders(nextOrders);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load flagged orders."
          );
          setOrders(EMPTY_ORDER_RESULT);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [isAuthLoading, page, router, search, selectedEventId, selectedRiskLevel, user]);

  if (isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading flagged orders...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Flagged Orders
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review medium/high-risk orders and resolve operational concerns.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              All Orders
            </Link>
            <Link
              href="/admin/notifications"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Notifications
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Email or order ID"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Event
          <select
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Risk Level
          <select
            value={selectedRiskLevel}
            onChange={(event) =>
              setSelectedRiskLevel(event.target.value as Extract<RiskLevel, "MEDIUM" | "HIGH"> | "")
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">MEDIUM + HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </label>

        <div className="flex items-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm text-slate-600">
            Filters apply automatically as you update values.
          </p>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <AdminOrderTable
        title="Flagged Orders"
        data={orders}
        isLoading={isLoading}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </main>
  );
}
