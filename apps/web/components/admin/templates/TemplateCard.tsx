import Link from "next/link";
import type { EventTemplateSummary } from "../../../lib/admin-api";

type TemplateCardProps = {
  template: EventTemplateSummary;
};

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
          {template.description ? (
            <p className="mt-1 text-sm text-slate-600">{template.description}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {template.ticketingMode}
        </span>
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-700">
        <p>Currency: {template.defaultCurrency}</p>
        <p>Venue: {template.venue ? `${template.venue.name} (${template.venue.location})` : "None"}</p>
        <p>Tier presets: {template.tierCount}</p>
        <p>Presale presets: {template.presaleCount}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/admin/templates/${template.id}`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Edit Template
        </Link>
      </div>
    </article>
  );
}
