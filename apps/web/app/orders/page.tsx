"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderCard } from "../../components/orders/OrderCard";
import { Skeleton } from "../../components/ui/Skeleton";
import { getOrders, type OrderListItem } from "../../lib/checkout-api";
import { useAuth } from "../../lib/auth-context";

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
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

    let isCancelled = false;

    async function loadOrders(): Promise<void> {
      setError(null);

      try {
        const nextOrders = await getOrders();

        if (!isCancelled) {
          setOrders(nextOrders);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
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
  }, [isAuthLoading, router, user]);

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-3 h-4 w-72" />
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={`orders-page-skeleton-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </article>
          ))}
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Orders</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review your purchase history and access your tickets.
        </p>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : orders.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">No orders yet.</p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      )}
    </main>
  );
}
