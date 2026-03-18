"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TicketLookupPanel } from "../../../components/admin/tickets/TicketLookupPanel";
import { useAuth } from "../../../lib/auth-context";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading ticket operations...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Ticket Operations
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Lookup ticket codes and process manual check-ins.
            </p>
          </div>

          <Link
            href="/admin/analytics"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Analytics
          </Link>
        </div>
      </section>

      <TicketLookupPanel />
    </main>
  );
}
