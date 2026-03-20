"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { TemplateForm } from "../../../../components/admin/templates/TemplateForm";
import {
  applyEventTemplate,
  deleteEventTemplate,
  getEventTemplateById,
  getVenues,
  updateEventTemplate,
  type EventTemplate,
  type EventTemplateInput,
  type Venue
} from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

export default function AdminTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading } = useAuth();

  const [template, setTemplate] = useState<EventTemplate | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyTitle, setApplyTitle] = useState("");
  const [applyDescription, setApplyDescription] = useState("");
  const [applyDate, setApplyDate] = useState("");
  const [applyVenueId, setApplyVenueId] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      setIsPageLoading(false);
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/");
      setIsPageLoading(false);
      return;
    }

    if (!templateId) {
      setError("Template not found.");
      setIsPageLoading(false);
      return;
    }

    async function loadTemplateContext(): Promise<void> {
      setError(null);

      try {
        const [templateResponse, venuesResponse] = await Promise.all([
          getEventTemplateById(templateId),
          getVenues()
        ]);

        setTemplate(templateResponse);
        setVenues(venuesResponse);
        setApplyVenueId(templateResponse.venue?.id ?? "");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load template details."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadTemplateContext();
  }, [isLoading, router, templateId, user]);

  async function handleUpdateTemplate(input: EventTemplateInput): Promise<void> {
    if (!template) {
      return;
    }

    const updatedTemplate = await updateEventTemplate(template.id, input);
    setTemplate(updatedTemplate);
  }

  async function handleDeleteTemplate(): Promise<void> {
    if (!template) {
      return;
    }

    await deleteEventTemplate(template.id);
    router.push("/admin/templates");
  }

  async function handleApplyTemplate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!template) {
      return;
    }

    setApplyMessage(null);
    setIsApplying(true);

    try {
      const eventResponse = await applyEventTemplate(template.id, {
        title: applyTitle.trim(),
        description: applyDescription.trim() || `${applyTitle.trim()} event`,
        date: new Date(applyDate).toISOString(),
        venueId: applyVenueId || undefined
      });

      setApplyMessage(`Event created: ${eventResponse.title}`);
      router.push(`/admin/events/${eventResponse.id}/analytics`);
    } catch (applyError) {
      setApplyMessage(
        applyError instanceof Error
          ? applyError.message
          : "Unable to apply template."
      );
    } finally {
      setIsApplying(false);
    }
  }

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading template...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !template) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Template not found."}</p>
        <Link
          href="/admin/templates"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Templates
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{template.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Template details and apply workflow.</p>
        </div>
        <Link
          href="/admin/templates"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Templates
        </Link>
      </div>

      <TemplateForm
        mode="edit"
        venues={venues}
        initialTemplate={template}
        onSubmit={handleUpdateTemplate}
        onDelete={handleDeleteTemplate}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Apply Template</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a new event from this template with event-specific details.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleApplyTemplate}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="apply-title">
              Event Title
            </label>
            <input
              id="apply-title"
              type="text"
              required
              value={applyTitle}
              onChange={(inputEvent) => setApplyTitle(inputEvent.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="apply-description"
            >
              Description
            </label>
            <textarea
              id="apply-description"
              value={applyDescription}
              onChange={(inputEvent) => setApplyDescription(inputEvent.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="apply-date">
                Event Date
              </label>
              <input
                id="apply-date"
                type="datetime-local"
                required
                value={applyDate}
                onChange={(inputEvent) => setApplyDate(inputEvent.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="apply-venue">
                Venue Override
              </label>
              <select
                id="apply-venue"
                value={applyVenueId}
                onChange={(inputEvent) => setApplyVenueId(inputEvent.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="">Use template default</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} ({venue.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {applyMessage ? <p className="text-sm text-slate-700">{applyMessage}</p> : null}

          <button
            type="submit"
            disabled={isApplying || !applyDate || !applyTitle.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isApplying ? "Creating Event..." : "Apply Template and Create Event"}
          </button>
        </form>
      </section>
    </main>
  );
}
