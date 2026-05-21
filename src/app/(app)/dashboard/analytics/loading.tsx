export default function PageLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/40" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-xl bg-muted/40 border border-border/20" />
      </div>

      {/* Row 1 Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-border/40 space-y-3">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-primary/20" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted/40" />
            <div className="h-3.5 w-24 animate-pulse rounded-md bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Row 2 Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-border/40 space-y-3">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-muted/50" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-muted/45" />
            <div className="h-3.5 w-20 animate-pulse rounded-md bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/20 border border-dashed border-border/30" />
        </div>
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/60" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-14 animate-pulse rounded-xl bg-muted/25" />
            ))}
          </div>
        </div>
      </div>

      {/* Peak Hours Skeleton */}
      <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/20 border border-dashed border-border/30" />
      </div>
    </div>
  );
}
