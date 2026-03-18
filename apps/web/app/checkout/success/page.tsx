"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrderById, type OrderDetail } from "../../../lib/checkout-api";
import { useAuth } from "../../../lib/auth-context";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const { user, isLoading: isAuthLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!orderId) {
      setError("Missing order id.");
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadOrder(): Promise<void> {
      setError(null);

      try {
        const orderSummary = await getOrderById(orderId);

        if (!isCancelled) {
          setOrder(orderSummary);
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
  }, [isAuthLoading, orderId, user]);

  if (isLoading || isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading order confirmation...</p>
      </main>
    );
  }

  if (error || !order) {
    if (!user && !error) {
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h1 className="text-3xl font-semibold tracking-tight text-emerald-900">Payment Successful</h1>
            <p className="mt-2 text-sm text-emerald-800">
              Your order is confirmed. Log in to view order history and tickets.
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Log In
            </Link>
            <Link
              href="/events"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Browse Events
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Order not found."}</p>
        <Link
          href="/events"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Browse Events
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-emerald-900">Payment Successful</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Your order has been confirmed and tickets have been issued.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Order #{order.id}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {new Date(order.createdAt).toLocaleString()} - {order.status}
        </p>

        <div className="mt-4 space-y-1 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{order.event.title}</p>
          <p>{new Date(order.event.date).toLocaleString()}</p>
          <p>
            {order.event.venue.name} - {order.event.venue.location}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-700">Total Paid</p>
          <p className="text-lg font-semibold text-slate-900">${order.totalAmount.toFixed(2)}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {user ? (
          <Link
            href="/orders"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            View My Orders
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Log In to View Orders
          </Link>
        )}

        {user && order.tickets.length > 0 ? (
          <Link
            href={`/tickets/${order.tickets[0].id}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            View Tickets
          </Link>
        ) : null}
      </div>
    </main>
  );
}
