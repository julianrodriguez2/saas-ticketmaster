"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutPlaceholderPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const seatIds = searchParams.get("seatIds");
  const tierId = searchParams.get("tierId");
  const quantity = searchParams.get("quantity");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Checkout (Coming Soon)</h1>
        <p className="mt-3 text-sm text-slate-600">
          Selection is validated. Payment and final booking confirmation will be added next.
        </p>

        <dl className="mt-5 space-y-2 text-sm text-slate-700">
          <div>
            <dt className="font-medium text-slate-900">Event ID</dt>
            <dd>{eventId ?? "N/A"}</dd>
          </div>
          {seatIds ? (
            <div>
              <dt className="font-medium text-slate-900">Selected Seat IDs</dt>
              <dd>{seatIds}</dd>
            </div>
          ) : null}
          {tierId ? (
            <div>
              <dt className="font-medium text-slate-900">GA Tier ID</dt>
              <dd>{tierId}</dd>
            </div>
          ) : null}
          {quantity ? (
            <div>
              <dt className="font-medium text-slate-900">GA Quantity</dt>
              <dd>{quantity}</dd>
            </div>
          ) : null}
        </dl>

        <Link
          href="/events"
          className="mt-6 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Events
        </Link>
      </section>
    </main>
  );
}