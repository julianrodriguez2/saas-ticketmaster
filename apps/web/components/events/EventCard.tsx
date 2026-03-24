import Link from "next/link";
import type { EventSummary } from "../../lib/events-api";

type EventCardProps = {
  event: EventSummary;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {new Date(event.date).toLocaleString()}
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          {event.ticketingMode}
        </span>
      </div>

      <h3 className="mt-2 text-lg font-semibold leading-tight text-slate-900">{event.title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {event.venue.name} · {event.venue.location}
      </p>

      <p className="mt-4 text-sm text-slate-700">
        Starting at{" "}
        <span className="font-semibold text-slate-900">
          {event.lowestTicketPrice === null
            ? "TBA"
            : `$${event.lowestTicketPrice.toFixed(2)}`}
        </span>
      </p>

      <div className="mt-auto pt-5">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition group-hover:bg-slate-800"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
