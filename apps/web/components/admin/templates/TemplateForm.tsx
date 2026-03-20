"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { EventTemplate, EventTemplateInput, PresaleAccessType, Venue } from "../../../lib/admin-api";
import {
  TemplateTierEditor,
  type TemplateTierDraft
} from "./TemplateTierEditor";

type TemplatePresaleDraft = {
  name: string;
  startsAtOffsetHours: string;
  endsAtOffsetHours: string;
  accessType: PresaleAccessType;
  accessCode: string;
  isActive: boolean;
};

type TemplateFormProps = {
  mode: "create" | "edit";
  venues: Venue[];
  initialTemplate?: EventTemplate;
  onSubmit: (input: EventTemplateInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const emptyTier: TemplateTierDraft = {
  name: "",
  price: "",
  quantity: ""
};

const emptyPresale: TemplatePresaleDraft = {
  name: "",
  startsAtOffsetHours: "",
  endsAtOffsetHours: "",
  accessType: "PUBLIC",
  accessCode: "",
  isActive: true
};

export function TemplateForm({
  mode,
  venues,
  initialTemplate,
  onSubmit,
  onDelete
}: TemplateFormProps) {
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [venueId, setVenueId] = useState(initialTemplate?.venue?.id ?? "");
  const [ticketingMode, setTicketingMode] = useState<"GA" | "RESERVED">(
    initialTemplate?.ticketingMode ?? "GA"
  );
  const [defaultCurrency, setDefaultCurrency] = useState(
    initialTemplate?.defaultCurrency ?? "USD"
  );
  const [tiers, setTiers] = useState<TemplateTierDraft[]>(
    initialTemplate?.ticketTiers.length
      ? initialTemplate.ticketTiers.map((tier) => ({
          name: tier.name,
          price: String(tier.price),
          quantity: String(tier.quantity)
        }))
      : [{ ...emptyTier }]
  );
  const [templatePresales, setTemplatePresales] = useState<TemplatePresaleDraft[]>(
    initialTemplate?.templatePresales.length
      ? initialTemplate.templatePresales.map((presale) => ({
          name: presale.name,
          startsAtOffsetHours:
            presale.startsAtOffsetHours === null ? "" : String(presale.startsAtOffsetHours),
          endsAtOffsetHours:
            presale.endsAtOffsetHours === null ? "" : String(presale.endsAtOffsetHours),
          accessType: presale.accessType,
          accessCode: presale.accessCode ?? "",
          isActive: presale.isActive
        }))
      : []
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!venueId && venues.length > 0) {
      setVenueId(venues[0].id);
    }
  }, [venueId, venues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsedTiers = tiers
      .map((tier) => ({
        name: tier.name.trim(),
        price: Number(tier.price),
        quantity: Number(tier.quantity)
      }))
      .filter((tier) => tier.name || tier.price || tier.quantity);

    if (ticketingMode === "GA") {
      if (parsedTiers.length === 0) {
        setError("GA templates require at least one tier.");
        return;
      }

      const hasInvalidTier = parsedTiers.some(
        (tier) =>
          !tier.name ||
          !Number.isFinite(tier.price) ||
          tier.price <= 0 ||
          !Number.isInteger(tier.quantity) ||
          tier.quantity <= 0
      );

      if (hasInvalidTier) {
        setError("Each tier must include a valid name, price, and quantity.");
        return;
      }
    }

    const parsedPresales = templatePresales
      .map((presale) => ({
        name: presale.name.trim(),
        startsAtOffsetHours: presale.startsAtOffsetHours.trim(),
        endsAtOffsetHours: presale.endsAtOffsetHours.trim(),
        accessType: presale.accessType,
        accessCode: presale.accessCode.trim(),
        isActive: presale.isActive
      }))
      .filter(
        (presale) =>
          presale.name ||
          presale.startsAtOffsetHours ||
          presale.endsAtOffsetHours ||
          presale.accessCode
      );

    const hasInvalidPresale = parsedPresales.some((presale) => {
      const startValue =
        presale.startsAtOffsetHours === "" ? null : Number(presale.startsAtOffsetHours);
      const endValue =
        presale.endsAtOffsetHours === "" ? null : Number(presale.endsAtOffsetHours);

      const missingCode = presale.accessType === "CODE" && !presale.accessCode;
      const invalidOffsets =
        (presale.startsAtOffsetHours !== "" && !Number.isInteger(startValue)) ||
        (presale.endsAtOffsetHours !== "" && !Number.isInteger(endValue)) ||
        (startValue !== null && endValue !== null && startValue >= endValue);

      return !presale.name || missingCode || invalidOffsets;
    });

    if (hasInvalidPresale) {
      setError("Template presales must have valid names, offsets, and access codes for CODE type.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        venueId: venueId || undefined,
        ticketingMode,
        defaultCurrency: defaultCurrency.trim().toUpperCase(),
        ticketTiers: parsedTiers.map((tier, index) => ({
          ...tier,
          sortOrder: index + 1
        })),
        templatePresales: parsedPresales.map((presale) => ({
          name: presale.name,
          startsAtOffsetHours:
            presale.startsAtOffsetHours === "" ? undefined : Number(presale.startsAtOffsetHours),
          endsAtOffsetHours:
            presale.endsAtOffsetHours === "" ? undefined : Number(presale.endsAtOffsetHours),
          accessType: presale.accessType,
          accessCode: presale.accessType === "CODE" ? presale.accessCode : undefined,
          isActive: presale.isActive
        }))
      });

      setSuccessMessage(mode === "create" ? "Template created." : "Template updated.");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to save template."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete template.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        {mode === "create" ? "New Event Template" : "Edit Event Template"}
      </h2>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="template-name">
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="Arena Concert Standard"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="template-description"
          >
            Description
          </label>
          <textarea
            id="template-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            placeholder="Reusable defaults for large venue weekend shows."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="template-venue">
              Default Venue
            </label>
            <select
              id="template-venue"
              value={venueId}
              onChange={(event) => setVenueId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">No default venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} ({venue.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="template-ticketing-mode"
            >
              Ticketing Mode
            </label>
            <select
              id="template-ticketing-mode"
              value={ticketingMode}
              onChange={(event) => setTicketingMode(event.target.value as "GA" | "RESERVED")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="GA">General Admission</option>
              <option value="RESERVED">Reserved Seating</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="template-currency"
            >
              Default Currency
            </label>
            <input
              id="template-currency"
              type="text"
              maxLength={3}
              value={defaultCurrency}
              onChange={(event) => setDefaultCurrency(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-slate-500"
              placeholder="USD"
            />
          </div>
        </div>

        <TemplateTierEditor
          tiers={tiers}
          onChange={setTiers}
          title="Default Pricing Tiers"
        />

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Template Presales
            </h3>
            <button
              type="button"
              onClick={() => setTemplatePresales((currentRows) => [...currentRows, { ...emptyPresale }])}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-white"
            >
              Add Presale
            </button>
          </div>

          {templatePresales.length === 0 ? (
            <p className="text-sm text-slate-500">No template presales.</p>
          ) : (
            <div className="space-y-2">
              {templatePresales.map((presale, index) => (
                <div
                  key={`template-presale-${index}`}
                  className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={presale.name}
                      onChange={(event) =>
                        setTemplatePresales((currentRows) =>
                          currentRows.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  name: event.target.value
                                }
                              : row
                          )
                        )
                      }
                      placeholder="Presale name"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <select
                      value={presale.accessType}
                      onChange={(event) =>
                        setTemplatePresales((currentRows) =>
                          currentRows.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  accessType: event.target.value as PresaleAccessType
                                }
                              : row
                          )
                        )
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    >
                      <option value="PUBLIC">PUBLIC</option>
                      <option value="CODE">CODE</option>
                      <option value="LINK_ONLY">LINK_ONLY</option>
                    </select>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      type="number"
                      value={presale.startsAtOffsetHours}
                      onChange={(event) =>
                        setTemplatePresales((currentRows) =>
                          currentRows.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  startsAtOffsetHours: event.target.value
                                }
                              : row
                          )
                        )
                      }
                      placeholder="Start offset (hours)"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="number"
                      value={presale.endsAtOffsetHours}
                      onChange={(event) =>
                        setTemplatePresales((currentRows) =>
                          currentRows.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  endsAtOffsetHours: event.target.value
                                }
                              : row
                          )
                        )
                      }
                      placeholder="End offset (hours)"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="text"
                      value={presale.accessCode}
                      onChange={(event) =>
                        setTemplatePresales((currentRows) =>
                          currentRows.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  accessCode: event.target.value
                                }
                              : row
                          )
                        )
                      }
                      placeholder="Access code (if CODE)"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={presale.isActive}
                        onChange={(event) =>
                          setTemplatePresales((currentRows) =>
                            currentRows.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    isActive: event.target.checked
                                  }
                                : row
                            )
                          )
                        }
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setTemplatePresales((currentRows) =>
                          currentRows.filter((_row, rowIndex) => rowIndex !== index)
                        )
                      }
                      className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Template"
                : "Save Template"}
          </button>

          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={isDeleting}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? "Deleting..." : "Delete Template"}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
