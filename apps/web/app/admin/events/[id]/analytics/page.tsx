"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../../../../../components/admin/analytics/KpiCard";
import { SalesVelocityChart } from "../../../../../components/admin/analytics/SalesVelocityChart";
import {
  getAdminEventAnalytics,
  type AdminEventAnalyticsDetail
} from "../../../../../lib/admin-api";
import { useAuth } from "../../../../../lib/auth-context";

export default function AdminEventAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const eventId = typeof params.id === "string" ? params.id : "";

  const [analytics, setAnalytics] = useState<AdminEventAnalyticsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    async function loadAnalytics(): Promise<void> {
      setError(null);

      try {
        const nextAnalytics = await getAdminEventAnalytics(eventId);

        if (!isCancelled) {
          setAnalytics(nextAnalytics);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event analytics."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isCancelled = true;
    };
  }, [eventId, isAuthLoading, router, user]);

  const kpiItems = useMemo(
    () =>
      analytics
        ? [
            {
              label: "Total Revenue",
              value: `$${analytics.metrics.totalRevenue.toFixed(2)}`
            },
            {
              label: "Paid Orders",
              value: String(analytics.metrics.paidOrders)
            },
            {
              label: "Tickets Sold",
              value: String(analytics.metrics.ticketsSold)
            },
            {
              label: "Attendees",
              value: String(analytics.metrics.attendeeCount)
            },
            {
              label: "Remaining Inventory",
              value: String(analytics.metrics.remainingInventory)
            },
            {
              label: "Occupancy",
              value: `${analytics.metrics.occupancyPercentage.toFixed(1)}%`
            }
          ]
        : [],
    [analytics]
  );

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading event analytics...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !analytics) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Event analytics not found."}</p>
        <Link
          href="/admin/analytics"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Analytics
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {analytics.event.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {new Date(analytics.event.date).toLocaleString()} | {analytics.event.venue.name} (
              {analytics.event.venue.location})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/analytics"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              All Analytics
            </Link>
            <Link
              href={`/admin/events/${eventId}/attendees`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Manage Attendees
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiItems.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <SalesVelocityChart
        title="Daily Sales"
        subtitle="Paid sales by day"
        series={analytics.dailySalesSeries}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ticket Tier Breakdown</h2>

          {analytics.ticketBreakdownByTier.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No tier-level ticket sales data available.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Tickets Sold</th>
                    <th className="pb-2 pr-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.ticketBreakdownByTier.map((tier) => (
                    <tr key={tier.tierId} className="border-t border-slate-200">
                      <td className="py-3 pr-4 text-slate-900">{tier.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{tier.ticketsSold}</td>
                      <td className="py-3 pr-4 text-slate-700">${tier.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Seat Status Breakdown</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Available: {analytics.seatStatusBreakdown.available}</li>
            <li>Reserved: {analytics.seatStatusBreakdown.reserved}</li>
            <li>Sold: {analytics.seatStatusBreakdown.sold}</li>
            <li>Blocked: {analytics.seatStatusBreakdown.blocked}</li>
            <li>Total Inventory: {analytics.seatStatusBreakdown.total}</li>
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>

        {analytics.recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No paid orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Tickets</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-900">{order.id}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {order.customerEmail ?? "Guest checkout"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">${order.totalAmount.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-slate-700">{order.ticketCount}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
