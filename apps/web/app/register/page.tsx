"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth-context";
import { apiRequest } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      await apiRequest<{ success: boolean }>("/auth/register", {
        method: "POST",
        body: { email, password }
      });

      await login(email, password);
      router.replace("/");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to register."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 sm:px-6 sm:py-20">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-2 text-sm text-slate-600">Start buying and managing tickets.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />

          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-slate-900 underline" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
