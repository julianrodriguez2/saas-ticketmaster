"use client";

import type { AdminAttendeeListResponse } from "../../../lib/admin-api";

type AttendeeTableProps = {
  data: AdminAttendeeListResponse;
  isLoading?: boolean;
  onPageChange: (nextPage: number) => void;
};

export function AttendeeTable({
  data,
  isLoading = false,
  onPageChange
}: AttendeeTableProps) {
  const { attendees, pagination } = data;
  const canGoBack = pagination.page > 1;
  const canGoForward =
    pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Attendees</h2>
        <p className="text-xs text-slate-500">
          {pagination.total} total | page {pagination.page}
          {pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ""}
        </p>
      </div>

      {attendees.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">No attendees found for this filter.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Attendee</th>
                <th className="pb-2 pr-4">Ticket Code</th>
                <th className="pb-2 pr-4">Seat/Tier</th>
                <th className="pb-2 pr-4">Ticket Status</th>
                <th className="pb-2 pr-4">Check-In</th>
                <th className="pb-2 pr-4">Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr key={attendee.ticketId} className="border-t border-slate-200">
                  <td className="py-3 pr-4 text-slate-700">
                    {attendee.customerEmail ?? "Guest checkout"}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {attendee.attendeeName ?? "N/A"}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900">{attendee.ticketCode}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {attendee.seat
                      ? `${attendee.seat.section} - Row ${attendee.seat.row} Seat ${attendee.seat.seatNumber}`
                      : attendee.tier?.name ?? "GA"}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{attendee.ticketStatus}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {attendee.checkInStatus}
                    {attendee.checkedInAt
                      ? ` (${new Date(attendee.checkedInAt).toLocaleTimeString()})`
                      : ""}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {new Date(attendee.purchaseDate).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={!canGoBack || isLoading}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!canGoForward || isLoading}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </section>
  );
}
