import { Skeleton } from "../../../components/ui/Skeleton";

export default function TicketDetailLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-6">
          <Skeleton className="h-4 w-32 bg-slate-700" />
          <Skeleton className="mt-3 h-8 w-2/3 bg-slate-700" />
          <Skeleton className="mt-3 h-4 w-1/2 bg-slate-700" />
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-7 w-40" />
            <Skeleton className="mt-6 h-4 w-24" />
            <Skeleton className="mt-2 h-5 w-36" />
          </div>
          <div className="flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-xl" />
          </div>
        </div>
      </section>
    </main>
  );
}

