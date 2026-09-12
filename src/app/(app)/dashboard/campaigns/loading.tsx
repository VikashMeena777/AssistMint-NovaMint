// Matches the campaigns page: header + 3 stat cards + campaign card list
export default function CampaignsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Campaign cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-44 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/70" />
                <div className="flex items-center gap-4">
                  <div className="h-3 w-36 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
              <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
