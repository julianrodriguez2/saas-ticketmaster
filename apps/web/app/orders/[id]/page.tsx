"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderSummary } from "../../../components/orders/OrderSummary";
import { Skeleton } from "../../../components/ui/Skeleton";
import { getOrderById, type OrderDetail } from "../../../lib/checkout-api";
import { useAuth } from "../../../lib/auth-context";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const orderId = typeof params.id === "string" ? params.id : "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      setIsLoading(false);
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
        const nextOrder = await getOrderById(orderId);

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
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-80" />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-4 h-20 w-full" />
          <Skeleton className="mt-3 h-20 w-full" />
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !order) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Order not found."}</p>
        <Link
          href="/orders"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Orders
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <OrderSummary order={order} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Tickets</h2>

        {order.tickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Tickets are being issued. Refresh shortly.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {order.tickets.map((ticket) => (
              <article
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Code: {ticket.code}</p>
                  <p>Status: {ticket.status}</p>
                  <p>
                    {ticket.seat
                      ? `${ticket.seat.section} - Row ${ticket.seat.row} Seat ${ticket.seat.seatNumber}`
                      : ticket.ticketTier?.name ?? "General Admission"}
                  </p>
                </div>

                <Link
                  href={`/tickets/${ticket.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  View Ticket
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
