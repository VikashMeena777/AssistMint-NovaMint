export default function PageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
