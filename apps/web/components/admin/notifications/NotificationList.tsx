"use client";

import { NotificationItem } from "./NotificationItem";
import type { AdminNotification } from "../../../lib/admin-api";
import { Skeleton } from "../../ui/Skeleton";

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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`notification-skeleton-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
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
