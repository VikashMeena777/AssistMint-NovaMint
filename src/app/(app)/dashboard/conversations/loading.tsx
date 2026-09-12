export default function PageLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
      {/* Two-pane layout: list + chat panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card">
          <div className="border-b border-border p-3">
            <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-36 animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-2xl border border-border/50 bg-card lg:block lg:col-span-2">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="h-10 animate-pulse rounded-2xl bg-muted"
                  style={{ width: `${45 + ((i * 13) % 30)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
