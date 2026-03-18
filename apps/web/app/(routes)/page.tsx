"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";

export default function HomePage() {
  const { user, isLoading, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout(): Promise<void> {
    setError(null);
    setIsSubmitting(true);

    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to log out.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-20">
      <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Ticketing Platform</h1>
        <p className="mt-4 text-lg text-slate-600">Fast, seamless ticket buying</p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          {isLoading ? (
            <p className="text-sm text-slate-600">Checking session...</p>
          ) : user ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Logged in as <span className="font-medium text-slate-900">{user.email}</span>
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">Role: {user.role}</p>
              <div className="flex flex-wrap gap-3">
                {user.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Admin Dashboard
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isSubmitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">You are not logged in.</p>
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
