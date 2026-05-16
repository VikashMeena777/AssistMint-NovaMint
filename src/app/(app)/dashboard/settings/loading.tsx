export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
