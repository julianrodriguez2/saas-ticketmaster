"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TemplateForm } from "../../../../components/admin/templates/TemplateForm";
import {
  createEventTemplate,
  getVenues,
  type EventTemplateInput,
  type Venue
} from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

export default function NewAdminTemplatePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
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

    async function loadDependencies(): Promise<void> {
      setError(null);

      try {
        const nextVenues = await getVenues();
        setVenues(nextVenues);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load template dependencies."
        );
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadDependencies();
  }, [isLoading, router, user]);

  async function handleCreateTemplate(input: EventTemplateInput): Promise<void> {
    const template = await createEventTemplate(input);
    router.push(`/admin/templates/${template.id}`);
  }

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading template builder...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create Template</h1>
        <Link
          href="/admin/templates"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Templates
        </Link>
      </div>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      <TemplateForm mode="create" venues={venues} onSubmit={handleCreateTemplate} />
    </main>
  );
}
