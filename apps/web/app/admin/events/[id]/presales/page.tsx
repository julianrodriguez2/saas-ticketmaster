"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PresaleForm } from "../../../../../components/admin/presales/PresaleForm";
import { PresaleList } from "../../../../../components/admin/presales/PresaleList";
import {
  createEventPresale,
  deletePresale,
  getEventById,
  getEventPresales,
  updatePresale,
  type AdminEventDetail,
  type PresaleRule,
  type PresaleRuleInput
} from "../../../../../lib/admin-api";
import { useAuth } from "../../../../../lib/auth-context";

export default function AdminEventPresalesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading } = useAuth();

  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [presales, setPresales] = useState<PresaleRule[]>([]);
  const [editingPresale, setEditingPresale] = useState<PresaleRule | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPresaleContext = useCallback(async (): Promise<void> => {
    if (!eventId) {
      setError("Event not found.");
      return;
    }

    setError(null);

    try {
      const [eventResponse, presaleResponse] = await Promise.all([
        getEventById(eventId),
        getEventPresales(eventId)
      ]);

      setEvent(eventResponse);
      setPresales(presaleResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load presales.");
    } finally {
      setIsPageLoading(false);
    }
  }, [eventId]);

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

    void loadPresaleContext();
  }, [isLoading, loadPresaleContext, router, user]);

  async function handleCreatePresale(input: PresaleRuleInput): Promise<void> {
    if (!event) {
      return;
    }

    setSuccessMessage(null);
    await createEventPresale(event.id, input);
    setSuccessMessage("Presale rule created.");
    await loadPresaleContext();
  }

  async function handleUpdatePresale(input: PresaleRuleInput): Promise<void> {
    if (!editingPresale) {
      return;
    }

    setSuccessMessage(null);
    await updatePresale(editingPresale.id, input);
    setEditingPresale(null);
    setSuccessMessage("Presale rule updated.");
    await loadPresaleContext();
  }

  async function handleDeletePresale(presaleId: string): Promise<void> {
    setError(null);
    setSuccessMessage(null);

    try {
      await deletePresale(presaleId);
      setSuccessMessage("Presale rule deleted.");
      await loadPresaleContext();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete presale rule."
      );
    }
  }

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading presale manager...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Event not found."}</p>
        <Link
          href="/admin"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Admin
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event Presales
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {event.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage access windows for public, code, and link-only presales.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Admin
          </Link>
        </div>
      </section>

      {successMessage ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </section>
      ) : null}

      {editingPresale ? (
        <PresaleForm
          initialValue={editingPresale}
          onSubmit={handleUpdatePresale}
          onCancel={() => setEditingPresale(null)}
        />
      ) : (
        <PresaleForm onSubmit={handleCreatePresale} />
      )}

      <PresaleList
        presales={presales}
        onEdit={setEditingPresale}
        onDelete={handleDeletePresale}
      />
    </main>
  );
}
