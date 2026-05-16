export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="h-10 w-80 animate-pulse rounded-xl bg-muted" />
      <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
