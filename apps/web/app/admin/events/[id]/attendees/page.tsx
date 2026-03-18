"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AttendeeTable } from "../../../../../components/admin/attendees/AttendeeTable";
import {
  exportAdminEventAttendeesCsv,
  getAdminEventAttendees,
  type AdminAttendeeListResponse,
  type TicketStatus
} from "../../../../../lib/admin-api";
import { useAuth } from "../../../../../lib/auth-context";

const EMPTY_ATTENDEE_RESULT: AdminAttendeeListResponse = {
  event: {
    id: "",
    title: ""
  },
  attendees: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  }
};

export default function AdminEventAttendeesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const eventId = typeof params.id === "string" ? params.id : "";

  const [result, setResult] = useState<AdminAttendeeListResponse>(EMPTY_ATTENDEE_RESULT);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, selectedStatus]);

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

    if (!eventId) {
      setError("Event not found.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadAttendees(): Promise<void> {
      setError(null);
      setSuccess(null);
      setIsLoading(true);

      try {
        const nextResult = await getAdminEventAttendees(eventId, {
          page,
          limit: 50,
          search: search || undefined,
          status: selectedStatus || undefined
        });

        if (!isCancelled) {
          setResult(nextResult);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load attendees."
          );
          setResult(EMPTY_ATTENDEE_RESULT);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAttendees();

    return () => {
      isCancelled = true;
    };
  }, [eventId, isAuthLoading, page, router, search, selectedStatus, user]);

  async function handleExportCsv(): Promise<void> {
    if (!eventId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsExporting(true);

    try {
      const exportResult = await exportAdminEventAttendeesCsv(eventId, {
        search: search || undefined,
        status: selectedStatus || undefined
      });

      const objectUrl = URL.createObjectURL(exportResult.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportResult.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      setSuccess("Attendee CSV exported.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading attendees...</p>
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
              Attendee Management
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Event: {result.event.title || "Event attendees"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events/${eventId}/analytics`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Event Analytics
            </Link>
            <Link
              href="/admin/tickets"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Ticket Lookup
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Code, email, attendee"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Ticket Status
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as TicketStatus | "")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="USED">USED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={isExporting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
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

      <AttendeeTable
        data={result}
        isLoading={isLoading}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </main>
  );
}
