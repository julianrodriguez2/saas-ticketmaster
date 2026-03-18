"use client";

type KpiCardProps = {
  label: string;
  value: string;
  helperText?: string;
};

export function KpiCard({ label, value, helperText }: KpiCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {helperText ? <p className="mt-1 text-xs text-slate-500">{helperText}</p> : null}
    </article>
  );
}
