"use client";

import Link from "next/link";
import type { AdminNotification } from "../../../lib/admin-api";

type NotificationItemProps = {
  notification: AdminNotification;
  isUpdating?: boolean;
  onMarkRead: (notificationId: string) => Promise<void>;
};

const severityClassMap = {
  INFO: "bg-sky-100 text-sky-700 border-sky-200",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200",
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200"
} as const;

export function NotificationItem({
  notification,
  isUpdating = false,
  onMarkRead
}: NotificationItemProps) {
  const severityClasses = severityClassMap[notification.severity];
  const isRead = Boolean(notification.readAt);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${severityClasses}`}
            >
              {notification.severity}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {notification.type}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                isRead ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isRead ? "Read" : "Unread"}
            </span>
          </div>

          <h3 className="mt-3 text-base font-semibold text-slate-900">{notification.title}</h3>
          <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
        </div>

        {!isRead ? (
          <button
            type="button"
            onClick={() => void onMarkRead(notification.id)}
            disabled={isUpdating}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark Read
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{new Date(notification.createdAt).toLocaleString()}</span>
        {notification.relatedOrderId ? (
          <Link
            href={`/admin/orders/${notification.relatedOrderId}`}
            className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Order
          </Link>
        ) : null}
        {notification.relatedEventId ? (
          <Link
            href={`/admin/events/${notification.relatedEventId}/analytics`}
            className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Event
          </Link>
        ) : null}
        {notification.relatedTicketId ? (
          <Link
            href={`/admin/tickets`}
            className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Ticket Ops
          </Link>
        ) : null}
      </div>
    </article>
  );
}
