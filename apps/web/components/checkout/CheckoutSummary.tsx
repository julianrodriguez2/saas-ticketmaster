type EventSummary = {
  title: string;
  date: string;
  venue: {
    name: string;
    location: string;
  };
};

export type ReservedCheckoutSummary = {
  mode: "RESERVED";
  seats: Array<{
    id: string;
    section: string;
    row: string;
    seatNumber: string;
    label: string | null;
    price: number;
  }>;
  totalAmount: number;
};

export type GACheckoutSummary = {
  mode: "GA";
  tierId: string;
  tierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
};

export type CheckoutSummaryData = ReservedCheckoutSummary | GACheckoutSummary;

type CheckoutSummaryProps = {
  event: EventSummary;
  summary: CheckoutSummaryData;
};

export function CheckoutSummary({ event, summary }: CheckoutSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Order Summary</h2>

      <div className="mt-4 space-y-1 text-sm text-slate-700">
        <p className="font-medium text-slate-900">{event.title}</p>
        <p>{new Date(event.date).toLocaleString()}</p>
        <p>
          {event.venue.name} - {event.venue.location}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {summary.mode === "RESERVED" ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Reserved Seats ({summary.seats.length})
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {summary.seats.map((seat) => (
                <li key={seat.id} className="flex items-center justify-between gap-3">
                  <span>
                    {seat.section} - Row {seat.row} Seat {seat.seatNumber}
                  </span>
                  <span className="font-medium text-slate-900">${seat.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              General Admission
            </p>
            <p>
              {summary.tierName} x {summary.quantity}
            </p>
            <p>
              ${summary.unitPrice.toFixed(2)} each
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">Total</p>
        <p className="text-lg font-semibold text-slate-900">${summary.totalAmount.toFixed(2)}</p>
      </div>
    </section>
  );
}
