import type { BulkImportJobStatus } from "../../../lib/admin-api";

type ImportSummaryCardProps = {
  status: BulkImportJobStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  title?: string;
};

export function ImportSummaryCard({
  status,
  totalRows,
  successRows,
  failedRows,
  title = "Import Summary"
}: ImportSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Metric label="Status" value={status} />
        <Metric label="Total Rows" value={String(totalRows)} />
        <Metric label="Success" value={String(successRows)} />
        <Metric label="Failed" value={String(failedRows)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </article>
  );
}
