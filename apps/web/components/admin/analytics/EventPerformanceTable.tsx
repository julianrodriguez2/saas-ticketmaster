"use client";

import Link from "next/link";
import type { AdminEventPerformance } from "../../../lib/admin-api";

type EventPerformanceTableProps = {
  events: AdminEventPerformance[];
};

export function EventPerformanceTable({ events }: EventPerformanceTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Event Performance</h2>
        <p className="text-xs text-slate-500">{events.length} events</p>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">No events available yet.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Event</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Revenue</th>
                <th className="pb-2 pr-4">Tickets Sold</th>
                <th className="pb-2 pr-4">Remaining</th>
                <th className="pb-2 pr-4">Occupancy</th>
                <th className="pb-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.eventId} className="border-t border-slate-200">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {event.venue.name} - {event.venue.location}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {new Date(event.date).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">${event.totalRevenue.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-slate-700">{event.ticketsSold}</td>
                  <td className="py-3 pr-4 text-slate-700">{event.remainingInventory}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {event.occupancyPercentage.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/events/${event.eventId}/analytics`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        View Analytics
                      </Link>
                      <Link
                        href={`/admin/events/${event.eventId}/attendees`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Attendees
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
