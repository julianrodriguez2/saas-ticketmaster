import type { TicketDetail } from "../../lib/checkout-api";
import { QRCodeDisplay } from "./QRCodeDisplay";

type TicketCardProps = {
  ticket: TicketDetail;
};

function statusClassName(status: TicketDetail["status"]): string {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "USED") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-700";
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-5 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Mobile Ticket</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.event.title}</h1>
        <p className="mt-2 text-sm text-slate-200">{new Date(ticket.event.date).toLocaleString()}</p>
        <p className="text-sm text-slate-300">
          {ticket.event.venue.name} - {ticket.event.venue.location}
        </p>
      </header>

      <div className="relative px-5 py-5">
        <div className="absolute left-0 top-10 h-5 w-5 -translate-x-1/2 rounded-full bg-slate-50" />
        <div className="absolute right-0 top-10 h-5 w-5 translate-x-1/2 rounded-full bg-slate-50" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Ticket Code</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{ticket.code}</p>

            <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Entry</p>
            {ticket.seat ? (
              <p className="mt-1 text-sm text-slate-700">
                {ticket.seat.section} - Row {ticket.seat.row} Seat {ticket.seat.seatNumber}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-700">
                {ticket.ticketTier?.name ?? "General Admission"}
              </p>
            )}

            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClassName(
                ticket.status
              )}`}
            >
              {ticket.status}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <QRCodeDisplay imageDataUrl={ticket.qrCodeImage} altText={`QR code for ticket ${ticket.code}`} />
          </div>
        </div>
      </div>
    </article>
  );
}
