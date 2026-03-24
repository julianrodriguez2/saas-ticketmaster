"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminOrderTable } from "../../../components/admin/orders/AdminOrderTable";
import {
  exportAdminOrdersCsv,
  getAdminOrders,
  getEvents,
  type AdminEventSummary,
  type AdminOrderListResponse,
  type OrderStatus
} from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";

const EMPTY_ORDER_RESULT: AdminOrderListResponse = {
  orders: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [orders, setOrders] = useState<AdminOrderListResponse>(EMPTY_ORDER_RESULT);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "totalAmount" | "flaggedAt">(
    "createdAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setPage(1);
  }, [search, selectedStatus, selectedEventId, sortBy, sortOrder]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user || user.role !== "ADMIN") {
      return;
    }

    let isCancelled = false;

    async function loadOrders(): Promise<void> {
      setError(null);
      setSuccess(null);
      setIsLoading(true);

      try {
        const nextOrders = await getAdminOrders({
          page,
          limit: 20,
          search: search || undefined,
          status: selectedStatus || undefined,
          eventId: selectedEventId || undefined,
          sortBy,
          sortOrder
        });

        if (!isCancelled) {
          setOrders(nextOrders);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load orders."
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
  }, [isAuthLoading, page, search, selectedEventId, selectedStatus, sortBy, sortOrder, user]);

  async function handleExportOrders(): Promise<void> {
    setError(null);
    setSuccess(null);
    setIsExporting(true);

    try {
      const exportResult = await exportAdminOrdersCsv({
        search: search || undefined,
        status: selectedStatus || undefined,
        eventId: selectedEventId || undefined
      });

      const objectUrl = URL.createObjectURL(exportResult.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportResult.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      setSuccess("Orders CSV exported.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Order export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading admin orders...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  function handleResetFilters(): void {
    setSearch("");
    setSelectedStatus("");
    setSelectedEventId("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Admin Orders</h1>
            <p className="mt-2 text-sm text-slate-600">
              Support and operations view for payment and ticket issues.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/analytics"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Analytics
            </Link>
            <Link
              href="/admin/orders/flagged"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Flagged Orders
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

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-6">
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
          Status
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as OrderStatus | "")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
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
          Sort
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "createdAt" | "totalAmount" | "flaggedAt")
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="createdAt">Created At</option>
            <option value="totalAmount">Total Amount</option>
            <option value="flaggedAt">Flagged At</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Direction
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <div className="flex items-end">
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => void handleExportOrders()}
              disabled={isExporting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {success ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">{success}</p>
        </section>
      ) : null}

      <AdminOrderTable
        data={orders}
        isLoading={isLoading}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </main>
  );
}
