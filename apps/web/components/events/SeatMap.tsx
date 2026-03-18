import type { PublicSeatMap, SeatStatus } from "../../lib/events-api";

export type SeatSelectionCandidate = {
  id: string;
  section: string;
  row: string;
  seatNumber: string;
  label: string | null;
  price: number;
  status: SeatStatus;
};

type SeatMapProps = {
  sections: PublicSeatMap["sections"];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatSelectionCandidate) => void;
};

function getSeatClassName(status: SeatStatus, isSelected: boolean): string {
  if (isSelected) {
    return "border-slate-900 bg-slate-900 text-white";
  }

  if (status === "AVAILABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "RESERVED") {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }

  if (status === "SOLD") {
    return "border-rose-200 bg-rose-100 text-rose-700";
  }

  return "border-slate-300 bg-slate-200 text-slate-600";
}

export function SeatMap({ sections, selectedSeatIds, onToggleSeat }: SeatMapProps) {
  const selectedSeatIdSet = new Set(selectedSeatIds);

  return (
    <div className="space-y-4 overflow-x-auto pb-2">
      {sections.map((section, sectionIndex) => (
        <section
          key={`${section.name}-${sectionIndex}`}
          className="min-w-[520px] rounded-xl border border-slate-200 bg-white p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {section.name}
          </h3>

          <div className="mt-3 space-y-2">
            {section.rows.map((row, rowIndex) => (
              <div key={`${sectionIndex}-${row.label}-${rowIndex}`} className="flex items-center gap-3">
                <span className="w-6 text-xs font-semibold text-slate-500">{row.label}</span>

                <div className="flex flex-wrap gap-1">
                  {row.seats.map((seat) => {
                    const isSelected = selectedSeatIdSet.has(seat.id);
                    const isUnavailable = seat.status !== "AVAILABLE" && !isSelected;

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() =>
                          onToggleSeat({
                            id: seat.id,
                            section: section.name,
                            row: row.label,
                            seatNumber: seat.seatNumber,
                            label: seat.label,
                            price: seat.price,
                            status: seat.status
                          })
                        }
                        disabled={isUnavailable}
                        className={`h-8 min-w-8 rounded border px-2 text-[11px] font-semibold transition ${getSeatClassName(
                          seat.status,
                          isSelected
                        )} ${isUnavailable ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                        title={`${section.name} ${row.label}-${seat.seatNumber} ($${seat.price.toFixed(2)})`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
