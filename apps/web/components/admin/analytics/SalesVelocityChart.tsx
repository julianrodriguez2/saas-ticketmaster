"use client";

import type { AdminSalesVelocityPoint } from "../../../lib/admin-api";

type SalesVelocityChartProps = {
  title: string;
  subtitle?: string;
  series: AdminSalesVelocityPoint[];
};

export function SalesVelocityChart({
  title,
  subtitle,
  series
}: SalesVelocityChartProps) {
  const maxRevenue = Math.max(1, ...series.map((point) => point.revenue));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}

      {series.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">No paid sales recorded in this time window.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="flex min-w-max items-end gap-2">
            {series.map((point) => {
              const heightPercent = (point.revenue / maxRevenue) * 100;
              const displayDate = new Date(point.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric"
              });

              return (
                <div key={point.date} className="w-9 shrink-0">
                  <div className="flex h-44 items-end rounded-lg bg-slate-100 px-1 py-1">
                    <div
                      className="w-full rounded-md bg-slate-900 transition-all"
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                      title={`${displayDate}: $${point.revenue.toFixed(2)} (${point.orderCount} orders)`}
                    />
                  </div>
                  <p className="mt-2 truncate text-center text-[10px] text-slate-500">{displayDate}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
