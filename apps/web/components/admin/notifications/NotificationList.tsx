"use client";

import { NotificationItem } from "./NotificationItem";
import type { AdminNotification } from "../../../lib/admin-api";

type NotificationListProps = {
  notifications: AdminNotification[];
  isLoading?: boolean;
  pendingNotificationId?: string | null;
  onMarkRead: (notificationId: string) => Promise<void>;
};

export function NotificationList({
  notifications,
  isLoading = false,
  pendingNotificationId = null,
  onMarkRead
}: NotificationListProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Loading notifications...</p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">No notifications for this filter.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          isUpdating={pendingNotificationId === notification.id}
          onMarkRead={onMarkRead}
        />
      ))}
    </section>
  );
}
