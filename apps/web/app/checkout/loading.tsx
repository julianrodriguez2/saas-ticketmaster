import { Skeleton } from "../../components/ui/Skeleton";

export default function CheckoutLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-3 h-4 w-80" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-4 h-24 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-4 h-14 w-full" />
          <Skeleton className="mt-4 h-11 w-full rounded-lg" />
        </section>
      </div>
    </main>
  );
}

