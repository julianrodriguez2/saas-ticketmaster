import type { OrderDetail } from "../../lib/checkout-api";

type OrderSummaryProps = {
  order: OrderDetail;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Order Summary</h2>

      <div className="mt-4 space-y-1 text-sm text-slate-700">
        <p className="font-medium text-slate-900">{order.event.title}</p>
        <p>{new Date(order.event.date).toLocaleString()}</p>
        <p>
          {order.event.venue.name} - {order.event.venue.location}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Order ID</dt>
          <dd className="font-medium text-slate-900">{order.id}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd className="font-medium text-slate-900">{new Date(order.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium text-slate-900">{order.status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tickets</dt>
          <dd className="font-medium text-slate-900">{order.tickets.length}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">Payment</p>
        {order.payment ? (
          <div className="mt-2 text-sm text-slate-700">
            <p>Provider: {order.payment.provider}</p>
            <p>Status: {order.payment.status}</p>
            <p>Amount: ${order.payment.amount.toFixed(2)}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Payment details unavailable.</p>
        )}
      </div>
    </section>
  );
}
