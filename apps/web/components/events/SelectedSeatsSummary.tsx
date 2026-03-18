type SelectedSeat = {
  id: string;
  section: string;
  row: string;
  seatNumber: string;
  label: string | null;
  price: number;
};

type SelectedSeatsSummaryProps = {
  seats: SelectedSeat[];
};

export function SelectedSeatsSummary({ seats }: SelectedSeatsSummaryProps) {
  const totalPrice = seats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        Selected Seats
      </h3>

      {seats.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No seats selected yet.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {seats.map((seat) => (
              <li key={seat.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">
                  {seat.section} - Row {seat.row} Seat {seat.seatNumber}
                </p>
                <p className="text-slate-600">${seat.price.toFixed(2)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-slate-900">Total: ${totalPrice.toFixed(2)}</p>
        </>
      )}
    </section>
  );
}