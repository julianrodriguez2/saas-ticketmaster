import { Skeleton } from "../../../components/ui/Skeleton";

export default function OrderDetailLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-80" />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-4 h-20 w-full" />
        <Skeleton className="mt-3 h-20 w-full" />
      </section>
    </main>
  );
}

