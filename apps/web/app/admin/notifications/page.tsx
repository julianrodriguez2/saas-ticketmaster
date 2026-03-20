"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NotificationList } from "../../../components/admin/notifications/NotificationList";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type NotificationSeverity
} from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severity, setSeverity] = useState<NotificationSeverity | "">("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadNotifications = useCallback(async (): Promise<void> => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await getAdminNotifications({
        unreadOnly,
        severity: severity || undefined,
        type: typeFilter.trim() || undefined,
        limit: 100
      });
      setNotifications(response.notifications);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load notifications."
      );
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [severity, typeFilter, unreadOnly]);

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

    void loadNotifications();
  }, [isAuthLoading, loadNotifications, router, user]);

  async function handleMarkRead(notificationId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    setPendingNotificationId(notificationId);

    try {
      await markAdminNotificationRead(notificationId);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                readAt: new Date().toISOString()
              }
            : notification
        )
      );
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Unable to mark notification.");
    } finally {
      setPendingNotificationId(null);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    setError(null);
    setSuccess(null);
    setIsMarkingAll(true);

    try {
      const result = await markAllAdminNotificationsRead();
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? new Date().toISOString()
        }))
      );
      setSuccess(`${result.count} notifications marked as read.`);
    } catch (markAllError) {
      setError(
        markAllError instanceof Error
          ? markAllError.message
          : "Unable to mark all notifications."
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  if (isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading notification center...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Admin Notifications
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor suspicious activity, payment issues, and operational alerts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/orders/flagged"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Flagged Orders
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="flex items-end gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <span className="text-sm font-medium text-slate-700">Unread only</span>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as NotificationSeverity | "")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">All severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Type
          <input
            type="text"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            placeholder="ORDER_FLAGGED"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={isMarkingAll}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isMarkingAll ? "Marking..." : "Mark All Read"}
          </button>
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

      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        pendingNotificationId={pendingNotificationId}
        onMarkRead={handleMarkRead}
      />
    </main>
  );
}
