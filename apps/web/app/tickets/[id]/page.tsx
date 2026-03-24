"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TicketCard } from "../../../components/tickets/TicketCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { getTicketById, type TicketDetail } from "../../../lib/checkout-api";
import { useAuth } from "../../../lib/auth-context";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const ticketId = typeof params.id === "string" ? params.id : "";

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
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

    if (!ticketId) {
      setError("Ticket not found.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadTicket(): Promise<void> {
      setError(null);

      try {
        const nextTicket = await getTicketById(ticketId);

        if (!isCancelled) {
          setTicket(nextTicket);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load ticket.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTicket();

    return () => {
      isCancelled = true;
    };
  }, [isAuthLoading, router, ticketId, user]);

  if (isAuthLoading || isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-900 px-5 py-6">
            <Skeleton className="h-4 w-32 bg-slate-700" />
            <Skeleton className="mt-3 h-8 w-2/3 bg-slate-700" />
            <Skeleton className="mt-3 h-4 w-1/2 bg-slate-700" />
          </div>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-7 w-40" />
              <Skeleton className="mt-6 h-4 w-24" />
              <Skeleton className="mt-2 h-5 w-36" />
            </div>
            <div className="flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-xl" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !ticket) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-16">
        <p className="text-sm text-rose-600">{error ?? "Ticket not found."}</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <TicketCard ticket={ticket} />
    </main>
  );
}
