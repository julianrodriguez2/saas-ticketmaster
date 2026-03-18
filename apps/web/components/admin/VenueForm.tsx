"use client";

import { useState, type FormEvent } from "react";
import { createVenue } from "../../lib/admin-api";

type VenueFormProps = {
  onCreated: () => Promise<void> | void;
};

export function VenueForm({ onCreated }: VenueFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await createVenue({
        name,
        location
      });

      setName("");
      setLocation("");
      setSuccess("Venue created successfully.");
      await onCreated();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create venue."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Create Venue</h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="venue-name">
            Name
          </label>
          <input
            id="venue-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="Madison Square Garden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="venue-location">
            Location
          </label>
          <input
            id="venue-location"
            type="text"
            required
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="New York, NY"
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create Venue"}
        </button>
      </form>
    </section>
  );
}

