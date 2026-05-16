export default function MenuLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="flex justify-between">
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
