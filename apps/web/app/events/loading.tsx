import { Skeleton } from "../../components/ui/Skeleton";

export default function EventsLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={`events-loading-card-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-6 h-4 w-28" />
            <Skeleton className="mt-5 h-9 w-28 rounded-lg" />
          </article>
        ))}
      </section>
    </main>
  );
}

