"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminSeatMap,
  replaceAdminSeatMap,
  type AdminSeatMapPayload
} from "../../lib/admin-api";

type RowDraft = {
  label: string;
  sortOrder: number;
  price: number;
};

type SectionDraft = {
  id: string;
  name: string;
  color: string;
  numberOfRows: number;
  seatsPerRow: number;
  startRowLabel: string;
  defaultPrice: number;
  rowPriceIncrement: number;
  rows: RowDraft[];
};

type SeatMapBuilderProps = {
  eventId: string;
  onSaved?: () => Promise<void> | void;
};

const MAX_ROWS = 26;
const MAX_SEATS_PER_ROW = 80;

function createSectionDraft(): SectionDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    color: "",
    numberOfRows: 5,
    seatsPerRow: 10,
    startRowLabel: "A",
    defaultPrice: 120,
    rowPriceIncrement: 0,
    rows: []
  };
}

function generateRows(section: SectionDraft): RowDraft[] {
  const normalizedRows = Number.isFinite(section.numberOfRows)
    ? Math.trunc(section.numberOfRows)
    : 1;
  const safeRows = Math.max(1, Math.min(MAX_ROWS, normalizedRows));
  const safeStart = (section.startRowLabel || "A").trim().toUpperCase().charCodeAt(0);

  return Array.from({ length: safeRows }, (_row, rowIndex) => {
    const labelCharCode = safeStart + rowIndex;

    return {
      label: String.fromCharCode(labelCharCode),
      sortOrder: rowIndex + 1,
      price: Number((section.defaultPrice + rowIndex * section.rowPriceIncrement).toFixed(2))
    };
  });
}

export function SeatMapBuilder({ eventId, onSaved }: SeatMapBuilderProps) {
  const [sections, setSections] = useState<SectionDraft[]>([createSectionDraft()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadExistingSeatMap = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const seatMap = await getAdminSeatMap(eventId);

      if (seatMap.sections.length === 0) {
        setSections([createSectionDraft()]);
        return;
      }

      const mappedSections: SectionDraft[] = seatMap.sections.map((section) => {
        const rows = section.rows.map((row) => ({
          label: row.label,
          sortOrder: row.sortOrder,
          price: row.seats[0] ? row.seats[0].price : 0
        }));

        const firstRow = section.rows[0];

        return {
          id: section.id,
          name: section.name,
          color: section.color ?? "",
          numberOfRows: section.rows.length,
          seatsPerRow: firstRow ? firstRow.seats.length : 10,
          startRowLabel: rows[0]?.label ?? "A",
          defaultPrice: rows[0]?.price ?? 100,
          rowPriceIncrement: 0,
          rows
        };
      });

      setSections(mappedSections);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load existing seat map."
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadExistingSeatMap();
  }, [loadExistingSeatMap]);

  const totalSeats = useMemo(() => {
    return sections.reduce(
      (sum, section) => sum + section.rows.length * section.seatsPerRow,
      0
    );
  }, [sections]);

  function updateSection(sectionId: string, updater: (current: SectionDraft) => SectionDraft): void {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.id === sectionId ? updater(section) : section
      )
    );
  }

  function handleGenerateRows(sectionId: string): void {
    updateSection(sectionId, (section) => ({
      ...section,
      rows: generateRows(section)
    }));
  }

  function handleAddSection(): void {
    setSections((currentSections) => [...currentSections, createSectionDraft()]);
  }

  function handleRemoveSection(sectionId: string): void {
    setSections((currentSections) => {
      if (currentSections.length === 1) {
        return currentSections;
      }

      return currentSections.filter((section) => section.id !== sectionId);
    });
  }

  async function handleSave(): Promise<void> {
    setError(null);
    setSuccess(null);

    const payloadSections: AdminSeatMapPayload["sections"] = [];

    for (const section of sections) {
      const sectionName = section.name.trim();

      if (!sectionName) {
        setError("Each section requires a name.");
        return;
      }

      const normalizedSeatsPerRow = Number.isFinite(section.seatsPerRow)
        ? Math.trunc(section.seatsPerRow)
        : 1;
      const seatsPerRow = Math.max(1, Math.min(MAX_SEATS_PER_ROW, normalizedSeatsPerRow));
      const rows = section.rows.length > 0 ? section.rows : generateRows(section);

      if (rows.length === 0) {
        setError("Each section must include at least one row.");
        return;
      }

      const payloadRows: AdminSeatMapPayload["sections"][number]["rows"] = [];

      for (const [rowIndex, row] of rows.entries()) {
        const rowLabel = row.label.trim();

        if (!rowLabel) {
          setError("Each row requires a label.");
          return;
        }

        const rowPrice = Number(row.price);

        if (!Number.isFinite(rowPrice) || rowPrice <= 0) {
          setError("Each row price must be greater than zero.");
          return;
        }

        payloadRows.push({
          label: rowLabel,
          sortOrder: row.sortOrder,
          seats: Array.from({ length: seatsPerRow }, (_seat, seatIndex) => ({
            seatNumber: String(seatIndex + 1),
            x: seatIndex,
            y: rowIndex,
            price: rowPrice
          }))
        });
      }

      payloadSections.push({
        name: sectionName,
        color: section.color.trim() || undefined,
        rows: payloadRows
      });
    }

    setIsSaving(true);

    try {
      await replaceAdminSeatMap(eventId, {
        sections: payloadSections
      });

      setSuccess("Seat map saved successfully.");
      await onSaved?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save seat map."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading seat map builder...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Seat Map Builder</h2>
        <p className="text-sm text-slate-600">Estimated seats: {totalSeats}</p>
      </div>

      <div className="mt-5 space-y-5">
        {sections.map((section, sectionIndex) => (
          <article key={section.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Section {sectionIndex + 1}
              </h3>
              <button
                type="button"
                onClick={() => handleRemoveSection(section.id)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
                disabled={sections.length === 1}
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name
                <input
                  type="text"
                  value={section.name}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  placeholder="Floor A"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Color (optional)
                <input
                  type="text"
                  value={section.color}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      color: event.target.value
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  placeholder="#A855F7"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Number of rows
                <input
                  type="number"
                  min={1}
                  max={MAX_ROWS}
                  value={section.numberOfRows}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      numberOfRows: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Seats per row
                <input
                  type="number"
                  min={1}
                  max={MAX_SEATS_PER_ROW}
                  value={section.seatsPerRow}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      seatsPerRow: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Starting row label
                <input
                  type="text"
                  maxLength={1}
                  value={section.startRowLabel}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      startRowLabel: event.target.value
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Base price
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={section.defaultPrice}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      defaultPrice: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Row price increment
                <input
                  type="number"
                  step="0.01"
                  value={section.rowPriceIncrement}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      rowPriceIncrement: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateRows(section.id)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Generate Rows
              </button>
            </div>

            {section.rows.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2">Row</th>
                      <th className="pb-2">Sort Order</th>
                      <th className="pb-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, rowIndex) => (
                      <tr key={`${section.id}-row-${rowIndex}`} className="border-t border-slate-200">
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={row.label}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                rows: current.rows.map((existingRow, existingRowIndex) =>
                                  existingRowIndex === rowIndex
                                    ? {
                                        ...existingRow,
                                        label: event.target.value
                                      }
                                    : existingRow
                                )
                              }))
                            }
                            className="w-16 rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="py-2 pr-4">{row.sortOrder}</td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min={1}
                            step="0.01"
                            value={row.price}
                            onChange={(event) =>
                              updateSection(section.id, (current) => ({
                                ...current,
                                rows: current.rows.map((existingRow, existingRowIndex) =>
                                  existingRowIndex === rowIndex
                                    ? {
                                        ...existingRow,
                                        price: Number(event.target.value)
                                      }
                                    : existingRow
                                )
                              }))
                            }
                            className="w-24 rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleAddSection}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Add Section
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save Seat Map"}
        </button>
      </div>
    </section>
  );
}
