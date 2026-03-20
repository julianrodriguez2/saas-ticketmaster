"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CsvUploadForm } from "../../../../components/admin/imports/CsvUploadForm";
import { ImportErrorList } from "../../../../components/admin/imports/ImportErrorList";
import { ImportPreviewTable } from "../../../../components/admin/imports/ImportPreviewTable";
import { ImportSummaryCard } from "../../../../components/admin/imports/ImportSummaryCard";
import { commitEventImport, validateEventImportCsv } from "../../../../lib/admin-api";
import { useAuth } from "../../../../lib/auth-context";

type ValidationState = {
  importJob: {
    id: string;
    fileName: string;
    status: "PENDING" | "VALIDATED" | "COMPLETED" | "FAILED" | "PARTIAL";
    totalRows: number;
    successRows: number;
    failedRows: number;
    createdAt: string;
    completedAt: string | null;
  };
  previewRows: Array<{
    rowNumber: number;
    title: string;
    date: string;
    venue: string | null;
    ticketingMode: "GA" | "RESERVED" | null;
    currency: string;
    publishStatus: "DRAFT" | "PUBLISHED";
    templateId: string | null;
    warnings: string[];
    isValid: boolean;
  }>;
  validationErrors: Array<{
    rowNumber: number;
    fieldName: string | null;
    message: string;
    rawRowJson: Record<string, unknown> | null;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
};

export default function AdminEventImportsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [validationState, setValidationState] = useState<ValidationState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  async function handleValidateCsv(file: File): Promise<void> {
    setError(null);
    setCommitMessage(null);
    setIsValidating(true);

    try {
      const response = await validateEventImportCsv(file);
      setValidationState(response);
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Unable to validate import CSV."
      );
    } finally {
      setIsValidating(false);
    }
  }

  async function handleCommitImport(): Promise<void> {
    if (!validationState) {
      return;
    }

    setError(null);
    setCommitMessage(null);
    setIsCommitting(true);

    try {
      const result = await commitEventImport(validationState.importJob.id);
      setCommitMessage(
        `Import completed. Created ${result.successCount} events, ${result.failedCount} rows failed.`
      );
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Unable to commit import job."
      );
    } finally {
      setIsCommitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading imports workspace...</p>
      </main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const canCommit =
    validationState &&
    (validationState.importJob.status === "VALIDATED" ||
      validationState.importJob.status === "PARTIAL") &&
    validationState.summary.validRows > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Bulk Event Import</h1>
            <p className="mt-2 text-sm text-slate-600">
              Validate CSV rows before creating events, then commit in a separate step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/imports"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Import History
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </section>

      <CsvUploadForm onValidate={handleValidateCsv} isLoading={isValidating} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Supported CSV Columns</h2>
        <p className="mt-2 text-sm text-slate-600">
          Required: <code>title</code>, <code>date</code>, and one of <code>venueId</code> /{" "}
          <code>venueName</code> (or a template with default venue).
        </p>
        <p className="mt-2 text-sm text-slate-600">
        <p className="mt-2 text-sm text-slate-600">
          Optional: <code>description</code>, <code>templateId</code>, <code>ticketingMode</code>,{" "}
          <code>currency</code>, <code>salesStartAt</code>, <code>salesEndAt</code>,{" "}
          <code>publishStatus</code>, <code>presaleName</code>, <code>presaleStartsAt</code>,{" "}
          <code>presaleEndsAt</code>, <code>presaleAccessType</code>, <code>presaleAccessCode</code>, and tier
          fields like <code>ticketTier1Name</code>, <code>ticketTier1Price</code>,{" "}
          <code>ticketTier1Quantity</code>.
        </p>
      </section>

      {validationState ? (
        <ImportSummaryCard
          status={validationState.importJob.status}
          totalRows={validationState.summary.totalRows}
          successRows={validationState.summary.validRows}
          failedRows={validationState.summary.invalidRows}
          title="Validation Summary"
        />
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {commitMessage ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{commitMessage}</p>
        </section>
      ) : null}

      {validationState ? <ImportPreviewTable rows={validationState.previewRows} /> : null}

      {validationState ? (
        <ImportErrorList errors={validationState.validationErrors} />
      ) : null}

      {validationState ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">2. Commit Import</h2>
          <p className="mt-2 text-sm text-slate-600">
            Commit valid rows to create events. Invalid rows are skipped.
          </p>
          <button
            type="button"
            onClick={() => {
              void handleCommitImport();
            }}
            disabled={!canCommit || isCommitting}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCommitting ? "Committing..." : "Commit Import"}
          </button>
        </section>
      ) : null}
    </main>
  );
}
