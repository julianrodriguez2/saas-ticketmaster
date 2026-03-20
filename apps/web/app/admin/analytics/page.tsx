"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventPerformanceTable } from "../../../components/admin/analytics/EventPerformanceTable";
import { KpiCard } from "../../../components/admin/analytics/KpiCard";
import { SalesVelocityChart } from "../../../components/admin/analytics/SalesVelocityChart";
import {
  getAdminAnalyticsOverview,
  getAdminEventPerformance,
  getAdminSalesVelocity,
  type AdminAnalyticsOverview,
  type AdminEventPerformance,
  type AdminSalesVelocity
} from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [salesVelocity, setSalesVelocity] = useState<AdminSalesVelocity | null>(null);
  const [eventPerformance, setEventPerformance] = useState<AdminEventPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const [nextOverview, nextVelocity, nextEventPerformance] = await Promise.all([
        getAdminAnalyticsOverview(),
        getAdminSalesVelocity(),
        getAdminEventPerformance()
      ]);

      setOverview(nextOverview);
      setSalesVelocity(nextVelocity);
      setEventPerformance(nextEventPerformance);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load analytics."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    void loadAnalytics();
  }, [isAuthLoading, loadAnalytics, router, user]);

  const kpiItems = useMemo(
    () =>
      overview
        ? [
            {
              label: "Total Revenue",
              value: `$${overview.totalRevenue.toFixed(2)}`
            },
            {
              label: "Tickets Sold",
              value: String(overview.totalTicketsSold)
            },
            {
              label: "Paid Orders",
              value: String(overview.totalPaidOrders)
            },
            {
              label: "Upcoming Events",
              value: String(overview.totalUpcomingEvents)
            },
            {
              label: "Average Order Value",
              value: `$${overview.averageOrderValue.toFixed(2)}`
            },
            {
              label: "Recent Sales (7d)",
              value: String(overview.recentSalesCount)
            }
          ]
        : [],
    [overview]
  );

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading admin analytics...</p>
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
              Admin Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor platform performance, sales velocity, and event outcomes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Orders
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
            <Link
              href="/admin/tickets"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Ticket Ops
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {overview ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpiItems.map((item) => (
            <KpiCard key={item.label} label={item.label} value={item.value} />
          ))}
        </section>
      ) : null}

      <SalesVelocityChart
        title="Sales Velocity"
        subtitle="Paid orders grouped by day (last 30 days)"
        series={salesVelocity?.series ?? []}
      />

      <EventPerformanceTable events={eventPerformance} />
    </main>
  );
}
