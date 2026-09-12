export default function PageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      {/* Search bar */}
      <div className="max-w-md">
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
      </div>
      {/* Customer list rows */}
      <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
