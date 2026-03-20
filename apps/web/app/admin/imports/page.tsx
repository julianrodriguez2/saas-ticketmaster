"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getImportJobs, type ImportJobSummary } from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";

export default function AdminImportsHistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<ImportJobSummary[]>([]);
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

    async function loadJobs(): Promise<void> {
      setError(null);

      try {
        const response = await getImportJobs({ page: 1, limit: 50 });
        setJobs(response.jobs);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load import jobs.");
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadJobs();
  }, [isLoading, router, user]);

  if (isLoading || isPageLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-20">
        <p className="text-sm text-slate-600">Loading import history...</p>
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Import Jobs</h1>
            <p className="mt-2 text-sm text-slate-600">
              View previous CSV imports, statuses, and row-level outcomes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/imports/events"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              New Import
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

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {jobs.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">No imports yet.</p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">Created By</th>
                  <th className="px-3 py-2">Created At</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-3 py-2 text-slate-700">{job.fileName}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {job.successRows}/{job.totalRows} success
                    </td>
                    <td className="px-3 py-2 text-slate-600">{job.createdBy.email}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/imports/${job.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
