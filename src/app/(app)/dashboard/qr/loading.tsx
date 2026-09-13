// Matches the QR Studio page: header + explainer + create card + QR grid
export default function QrStudioLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
              <div className="h-3.5 w-16 animate-pulse rounded bg-muted/60" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/40" />
              <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Create card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-muted/40" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 w-32 animate-pulse rounded-full bg-muted/30" />
          ))}
        </div>
        <div className="mt-4 h-10 w-36 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* QR grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="h-46 w-full animate-pulse rounded-xl bg-muted/40" />
            <div className="mt-4 h-3 w-32 animate-pulse rounded bg-muted/60" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted/40" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
