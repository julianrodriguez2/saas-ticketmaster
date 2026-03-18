import Link from "next/link";
import type { OrderListItem } from "../../lib/checkout-api";

type OrderCardProps = {
  order: OrderListItem;
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {new Date(order.createdAt).toLocaleString()}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{order.event.title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {order.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Order ID</dt>
          <dd className="font-medium text-slate-900">{order.id}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total</dt>
          <dd className="font-medium text-slate-900">${order.totalAmount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tickets</dt>
          <dd className="font-medium text-slate-900">{order.ticketCount}</dd>
        </div>
      </dl>

      <Link
        href={`/orders/${order.id}`}
        className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        View Order
      </Link>
    </article>
  );
}
