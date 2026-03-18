"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutCancelPage() {
  const searchParams = useSearchParams();
  const retryQuery = searchParams.get("retry");

  const retryHref = useMemo(() => {
    if (!retryQuery) {
      return null;
    }

    return `/checkout?${retryQuery}`;
  }, [retryQuery]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-rose-900">Payment Failed</h1>
        <p className="mt-2 text-sm text-rose-800">
          We could not complete your payment. Your order was not finalized.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          You can retry checkout or go back to browse events.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {retryHref ? (
            <Link
              href={retryHref}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Retry Payment
            </Link>
          ) : null}

          <Link
            href="/events"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Events
          </Link>
        </div>
      </section>
    </main>
  );
}
