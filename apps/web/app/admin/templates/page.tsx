"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TemplateCard } from "../../../components/admin/templates/TemplateCard";
import { getEventTemplates, type EventTemplateSummary } from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";

export default function AdminTemplatesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [templates, setTemplates] = useState<EventTemplateSummary[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    async function loadTemplates(): Promise<void> {
      setError(null);

      try {
        const nextTemplates = await getEventTemplates();
        setTemplates(nextTemplates);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load templates."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadTemplates();
  }, [isLoading, router, user]);

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading templates...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Event Templates</h1>
            <p className="mt-2 text-sm text-slate-600">
              Build reusable pricing and presale defaults for rapid event publishing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to Admin
            </Link>
            <Link
              href="/admin/templates/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              New Template
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {templates.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">No templates created yet.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </section>
      )}
    </main>
  );
}
