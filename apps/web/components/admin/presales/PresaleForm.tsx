"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { PresaleAccessType, PresaleRule, PresaleRuleInput } from "../../../lib/admin-api";

type PresaleFormProps = {
  initialValue?: PresaleRule;
  onSubmit: (input: PresaleRuleInput) => Promise<void>;
  onCancel?: () => void;
};

export function PresaleForm({ initialValue, onSubmit, onCancel }: PresaleFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [startsAt, setStartsAt] = useState(
    initialValue ? toDateTimeLocalInput(initialValue.startsAt) : ""
  );
  const [endsAt, setEndsAt] = useState(
    initialValue ? toDateTimeLocalInput(initialValue.endsAt) : ""
  );
  const [accessType, setAccessType] = useState<PresaleAccessType>(
    initialValue?.accessType ?? "PUBLIC"
  );
  const [accessCode, setAccessCode] = useState(initialValue?.accessCode ?? "");
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeLabel = useMemo(
    () => (initialValue ? "Update Presale" : "Add Presale"),
    [initialValue]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Presale name is required.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError("Start and end times are required.");
      return;
    }

    if (accessType === "CODE" && !accessCode.trim()) {
      setError("Access code is required for CODE access type.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        accessType,
        accessCode: accessType === "CODE" ? accessCode.trim() : undefined,
        isActive
      });

      if (!initialValue) {
        setName("");
        setStartsAt("");
        setEndsAt("");
        setAccessType("PUBLIC");
        setAccessCode("");
        setIsActive(true);
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to save presale."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{modeLabel}</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Presale name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
        <select
          value={accessType}
          onChange={(event) => setAccessType(event.target.value as PresaleAccessType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        >
          <option value="PUBLIC">PUBLIC</option>
          <option value="CODE">CODE</option>
          <option value="LINK_ONLY">LINK_ONLY</option>
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      {accessType === "CODE" ? (
        <input
          type="text"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          placeholder="Access code"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      ) : null}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Active
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : modeLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function toDateTimeLocalInput(isoDate: string): string {
  const date = new Date(isoDate);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}
