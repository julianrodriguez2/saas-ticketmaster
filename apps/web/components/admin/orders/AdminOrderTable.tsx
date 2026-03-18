"use client";

import Link from "next/link";
import type { AdminOrderListResponse } from "../../../lib/admin-api";

type AdminOrderTableProps = {
  data: AdminOrderListResponse;
  isLoading?: boolean;
  onPageChange: (nextPage: number) => void;
};

export function AdminOrderTable({
  data,
  isLoading = false,
  onPageChange
}: AdminOrderTableProps) {
  const { orders, pagination } = data;
  const canGoBack = pagination.page > 1;
  const canGoForward =
    pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
        <p className="text-xs text-slate-500">
          {pagination.total} total | page {pagination.page}
          {pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">No matching orders found.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Order</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Event</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Tickets</th>
                <th className="pb-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-medium text-slate-900">{order.id}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {order.customerEmail ?? "Guest checkout"}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{order.event.title}</td>
                  <td className="py-3 pr-4 text-slate-700">${order.totalAmount.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-slate-700">{order.status}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{order.ticketCount}</td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      View
                    </Link>
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
