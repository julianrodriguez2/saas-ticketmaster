import type { SeatStatus } from "../../lib/events-api";

const seatLegendItems: Array<{
  status: SeatStatus | "SELECTED";
  label: string;
  className: string;
}> = [
  {
    status: "AVAILABLE",
    label: "Available",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  {
    status: "SELECTED",
    label: "Selected",
    className: "bg-slate-900 text-white border-slate-900"
  },
  {
    status: "RESERVED",
    label: "Reserved",
    className: "bg-amber-100 text-amber-800 border-amber-200"
  },
  {
    status: "SOLD",
    label: "Sold",
    className: "bg-rose-100 text-rose-700 border-rose-200"
  },
  {
    status: "BLOCKED",
    label: "Blocked",
    className: "bg-slate-200 text-slate-600 border-slate-300"
  }
];

export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {seatLegendItems.map((item) => (
        <span
          key={item.status}
          className={`rounded-full border px-2 py-1 text-xs font-medium ${item.className}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}