import { Skeleton } from "@/components/ui/skeleton";

/** Squelette dédié au tableau de bord (KPIs + graphe + activité). */
export default function DashboardHomeLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-10 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
