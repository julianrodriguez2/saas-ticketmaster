"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getAdminOrderById,
  reviewAdminOrder,
  type AdminOrderDetail
} from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

function getRiskBadgeClasses(riskLevel: AdminOrderDetail["riskLevel"]): string {
  if (riskLevel === "HIGH") {
    return "bg-rose-100 text-rose-700";
  }

  if (riskLevel === "MEDIUM") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const orderId = typeof params.id === "string" ? params.id : "";

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          setReviewNotes(nextOrder.review.reviewNotes ?? "");
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

  const riskBadgeClasses = useMemo(
    () => (order ? getRiskBadgeClasses(order.riskLevel) : ""),
    [order]
  );

  async function handleReviewSubmit(): Promise<void> {
    if (!order || !user) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsReviewing(true);

    try {
      const review = await reviewAdminOrder(order.id, reviewNotes.trim() || undefined);

      setOrder((currentOrder) =>
        currentOrder
          ? {
              ...currentOrder,
              review: {
                reviewedAt: review.reviewedAt,
                reviewNotes: review.reviewNotes,
                reviewedBy: currentOrder.review.reviewedBy ?? {
                  id: user.id,
                  email: user.email
                }
              }
            }
          : currentOrder
      );

      setSuccess("Order review saved.");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to save review.");
    } finally {
      setIsReviewing(false);
    }
  }

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

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${riskBadgeClasses}`}
            >
              Risk: {order.riskLevel}
            </span>
            <Link
              href="/admin/orders/flagged"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Flagged Orders
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {success ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">{success}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>Email: {order.customer.email ?? "Guest checkout"}</p>
            <p>User ID: {order.customer.userId ?? "N/A"}</p>
            <p>IP: {order.ipAddress ?? "N/A"}</p>
            <p className="break-all">User Agent: {order.userAgent ?? "N/A"}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
          {order.payment ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>Provider: {order.payment.provider}</p>
              <p>Status: {order.payment.status}</p>
              <p>Amount: ${order.payment.amount.toFixed(2)}</p>
              <p className="break-all">Intent: {order.payment.paymentIntentId}</p>
              <p>Response Code: {order.payment.providerResponseCode ?? "N/A"}</p>
              <p>Failure Reason: {order.payment.failureReason ?? "N/A"}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No payment record yet.</p>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Risk Review</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              Flagged At:{" "}
              {order.flaggedAt ? new Date(order.flaggedAt).toLocaleString() : "Not flagged"}
            </p>
            <p>
              Reviewed At:{" "}
              {order.review.reviewedAt
                ? new Date(order.review.reviewedAt).toLocaleString()
                : "Not reviewed"}
            </p>
            <p>Reviewed By: {order.review.reviewedBy?.email ?? "N/A"}</p>
          </div>

          <div className="mt-3">
            <p className="text-sm font-medium text-slate-700">Fraud Flags</p>
            {order.fraudFlags.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">No fraud flags on this order.</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-2">
                {order.fraudFlags.map((flag) => (
                  <li
                    key={flag}
                    className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700"
                  >
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Review Notes
            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Add notes for support/fraud review..."
            />
          </label>
          <button
            type="button"
            onClick={() => void handleReviewSubmit()}
            disabled={isReviewing}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isReviewing ? "Saving..." : "Mark Reviewed"}
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment Attempt Summary</h2>
          {order.paymentAttempts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No related attempts found.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Reason</th>
                    <th className="pb-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {order.paymentAttempts.map((attempt) => (
                    <tr key={attempt.id} className="border-t border-slate-200">
                      <td className="py-2 pr-4 text-slate-700">{attempt.status}</td>
                      <td className="py-2 pr-4 text-slate-700">{attempt.reason ?? "N/A"}</td>
                      <td className="py-2 pr-4 text-slate-700">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Related Notifications</h2>
        {order.notifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No notifications linked to this order.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {order.notifications.map((notification) => (
              <article key={notification.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      notification.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-700"
                        : notification.severity === "WARNING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {notification.severity}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {notification.type}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
              </article>
            ))}
          </div>
        )}
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
