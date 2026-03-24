import { Skeleton } from "../../components/ui/Skeleton";

export default function OrdersLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-72" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`orders-loading-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </article>
        ))}
      </section>
    </main>
  );
}

