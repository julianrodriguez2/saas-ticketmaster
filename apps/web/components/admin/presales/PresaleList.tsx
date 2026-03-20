"use client";

import type { PresaleRule } from "../../../lib/admin-api";

type PresaleListProps = {
  presales: PresaleRule[];
  onEdit: (presale: PresaleRule) => void;
  onDelete: (presaleId: string) => Promise<void>;
};

export function PresaleList({ presales, onEdit, onDelete }: PresaleListProps) {
  if (presales.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Presale Rules</h2>
        <p className="mt-3 text-sm text-slate-600">No presales configured.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Presale Rules</h2>
      <div className="mt-4 space-y-3">
        {presales.map((presale) => (
          <article key={presale.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{presale.name}</h3>
                <p className="mt-1 text-sm text-slate-700">
                  {new Date(presale.startsAt).toLocaleString()} to {new Date(presale.endsAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-600">
                  {presale.accessType}
                  {presale.accessType === "CODE" && presale.accessCode
                    ? ` (${presale.accessCode})`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  presale.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {presale.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEdit(presale)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  void onDelete(presale.id);
                }}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
