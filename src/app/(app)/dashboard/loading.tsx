export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="h-5 w-36 animate-pulse rounded bg-muted mb-4" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
