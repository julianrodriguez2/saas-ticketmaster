"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminOrderById, type AdminOrderDetail } from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const orderId = typeof params.id === "string" ? params.id : "";

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
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

    if (!orderId) {
      setError("Order not found.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadOrder(): Promise<void> {
      setError(null);

      try {
        const nextOrder = await getAdminOrderById(orderId);

        if (!isCancelled) {
          setOrder(nextOrder);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load order.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isCancelled = true;
    };
  }, [isAuthLoading, orderId, router, user]);

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading order detail...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !order) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Order not found."}</p>
        <Link
          href="/admin/orders"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Orders
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {order.id}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {new Date(order.createdAt).toLocaleString()} | Status: {order.status}
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Orders
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>Email: {order.customer.email ?? "Guest checkout"}</p>
            <p>User ID: {order.customer.userId ?? "N/A"}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
          {order.payment ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>Provider: {order.payment.provider}</p>
              <p>Status: {order.payment.status}</p>
              <p>Amount: ${order.payment.amount.toFixed(2)}</p>
              <p>Intent: {order.payment.paymentIntentId}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No payment record yet.</p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Event</h2>
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>{order.event.title}</p>
          <p>{new Date(order.event.date).toLocaleString()}</p>
          <p>
            {order.event.venue.name} - {order.event.venue.location}
          </p>
          <p className="font-medium text-slate-900">Order Total: ${order.totalAmount.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tickets</h2>
        {order.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No tickets issued yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Code</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Check-In</th>
                  <th className="pb-2 pr-4">Seat/Tier</th>
                  <th className="pb-2 pr-4">Attendee</th>
                </tr>
              </thead>
              <tbody>
                {order.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-900">{ticket.code}</td>
                    <td className="py-3 pr-4 text-slate-700">{ticket.status}</td>
                    <td className="py-3 pr-4 text-slate-700">{ticket.checkInStatus}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {ticket.seat
                        ? `${ticket.seat.section} - Row ${ticket.seat.row} Seat ${ticket.seat.seatNumber}`
                        : ticket.ticketTier?.name ?? "GA"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{ticket.attendeeName ?? "N/A"}</td>
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
