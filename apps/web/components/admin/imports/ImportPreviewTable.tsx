import type { ImportPreviewRow } from "../../../lib/admin-api";

type ImportPreviewTableProps = {
  rows: ImportPreviewRow[];
};

export function ImportPreviewTable({ rows }: ImportPreviewTableProps) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Parsed Preview</h2>
        <p className="mt-3 text-sm text-slate-600">No rows parsed yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Parsed Preview</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Venue</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-3 py-2 text-slate-600">{row.rowNumber}</td>
                <td className="px-3 py-2 text-slate-800">{row.title || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{row.date || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{row.venue ?? "-"}</td>
                <td className="px-3 py-2 text-slate-600">{row.ticketingMode ?? "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      row.isValid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {row.isValid ? "Valid" : "Invalid"}
                  </span>
                  {row.warnings.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-700">{row.warnings.join(" | ")}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
