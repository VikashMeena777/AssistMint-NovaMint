export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Stats grid skeleton (4 cards, same grid) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-center justify-between border-t border-border pt-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts skeleton (two cards, same grid) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-52 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Quick actions + setup checklist (two cards) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-4 rounded-2xl border border-border/50 bg-card p-6">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            {i === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-16 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-6 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
