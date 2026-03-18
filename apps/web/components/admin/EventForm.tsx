"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createEvent,
  type CreateEventInput,
  type TicketingMode,
  type Venue
} from "../../lib/admin-api";
import {
  TicketTierInput,
  type TicketTierDraft
} from "./TicketTierInput";

type EventFormProps = {
  venues: Venue[];
  onCreated: () => Promise<void> | void;
};

const emptyTicketTier: TicketTierDraft = {
  name: "",
  price: "",
  quantity: ""
};

export function EventForm({ venues, onCreated }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [venueId, setVenueId] = useState("");
  const [ticketingMode, setTicketingMode] = useState<TicketingMode>("GA");
  const [ticketTiers, setTicketTiers] = useState<TicketTierDraft[]>([
    emptyTicketTier
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!venueId && venues.length > 0) {
      setVenueId(venues[0].id);
    }
  }, [venueId, venues]);

  function handleTierChange(index: number, nextTier: TicketTierDraft): void {
    setTicketTiers((currentTiers) =>
      currentTiers.map((tier, tierIndex) =>
        tierIndex === index ? nextTier : tier
      )
    );
  }

  function handleAddTier(): void {
    setTicketTiers((currentTiers) => [...currentTiers, { ...emptyTicketTier }]);
  }

  function handleRemoveTier(index: number): void {
    setTicketTiers((currentTiers) =>
      currentTiers.filter((_tier, tierIndex) => tierIndex !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!venueId) {
      setError("Create a venue before creating an event.");
      return;
    }

    let parsedTicketTiers: CreateEventInput["ticketTiers"] = [];

    if (ticketingMode === "GA") {
      parsedTicketTiers = ticketTiers.map((tier) => ({
        name: tier.name.trim(),
        price: Number(tier.price),
        quantity: Number(tier.quantity)
      }));

      const hasInvalidTier = parsedTicketTiers.some(
        (tier) =>
          !tier.name ||
          !Number.isFinite(tier.price) ||
          tier.price <= 0 ||
          !Number.isInteger(tier.quantity) ||
          tier.quantity <= 0
      );

      if (hasInvalidTier) {
        setError("Each GA ticket tier must include name, price, and quantity.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: CreateEventInput = {
        title,
        description,
        date,
        venueId,
        ticketingMode,
        ticketTiers: parsedTicketTiers
      };

      const createdEvent = await createEvent(payload);

      setTitle("");
      setDescription("");
      setDate("");
      setTicketingMode("GA");
      setTicketTiers([{ ...emptyTicketTier }]);
      setSuccess(
        createdEvent.ticketingMode === "RESERVED"
          ? "Reserved event created. Configure its seat map from the dashboard."
          : "GA event created successfully."
      );
      await onCreated();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create event."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="create-event" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Create Event</h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="event-title">
            Title
          </label>
          <input
            id="event-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="Summer Music Festival"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            required
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="A full-day live music experience."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="event-date">
              Date
            </label>
            <input
              id="event-date"
              type="datetime-local"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="event-venue">
              Venue
            </label>
            <select
              id="event-venue"
              required
              value={venueId}
              onChange={(event) => setVenueId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              disabled={venues.length === 0}
            >
              {venues.length === 0 ? (
                <option value="">No venues available</option>
              ) : (
                venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} ({venue.location})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="ticketing-mode">
            Ticketing Mode
          </label>
          <select
            id="ticketing-mode"
            value={ticketingMode}
            onChange={(event) => setTicketingMode(event.target.value as TicketingMode)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="GA">General Admission (GA)</option>
            <option value="RESERVED">Reserved Seating</option>
          </select>
        </div>

        {ticketingMode === "GA" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                GA Ticket Tiers
              </h3>
              <button
                type="button"
                onClick={handleAddTier}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Add Tier
              </button>
            </div>

            {ticketTiers.map((tier, index) => (
              <TicketTierInput
                key={`ticket-tier-${index}`}
                index={index}
                value={tier}
                canRemove={ticketTiers.length > 1}
                onChange={(nextTier) => handleTierChange(index, nextTier)}
                onRemove={() => handleRemoveTier(index)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              This event will use reserved seating. Configure the seat map after creating the event.
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || venues.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create Event"}
        </button>
      </form>
    </section>
  );
}