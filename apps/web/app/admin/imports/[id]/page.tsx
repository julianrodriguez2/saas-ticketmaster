"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImportErrorList } from "../../../../components/admin/imports/ImportErrorList";
import { ImportSummaryCard } from "../../../../components/admin/imports/ImportSummaryCard";
import { getImportJobById, type ImportJobDetail } from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

export default function AdminImportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const importJobId = typeof params.id === "string" ? params.id : "";
  const { user, isLoading } = useAuth();

  const [job, setJob] = useState<ImportJobDetail | null>(null);
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

    if (!importJobId) {
      setError("Import job not found.");
      setIsPageLoading(false);
      return;
    }

    async function loadJob(): Promise<void> {
      setError(null);

      try {
        const nextJob = await getImportJobById(importJobId);
        setJob(nextJob);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load import job.");
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadJob();
  }, [importJobId, isLoading, router, user]);

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading import job...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  if (error || !job) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-6 py-20">
        <p className="text-sm text-rose-600">{error ?? "Import job not found."}</p>
        <Link
          href="/admin/imports"
          className="inline-flex w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to Imports
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{job.fileName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Created by {job.createdBy.email} on {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
          <Link
            href="/admin/imports"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Imports
          </Link>
        </div>
      </section>

      <ImportSummaryCard
        status={job.status}
        totalRows={job.totalRows}
        successRows={job.successRows}
        failedRows={job.failedRows}
      />

      <ImportErrorList
        errors={job.rowErrors.map((rowError) => ({
          rowNumber: rowError.rowNumber,
          fieldName: rowError.fieldName,
          message: rowError.message,
          rawRowJson: rowError.rawRowJson
        }))}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Summary JSON</h2>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          {JSON.stringify(job.summaryJson, null, 2)}
        </pre>
      </section>
    </main>
  );
}
