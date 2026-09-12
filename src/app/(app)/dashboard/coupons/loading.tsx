// Matches the coupons page: header + 4 stat cards + coupon card grid
export default function CouponsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </div>

      {/* Coupon cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
            <div className="flex items-center justify-between border-t border-border/40 pt-3">
              <div className="h-8 w-20 animate-pulse rounded-xl bg-muted" />
              <div className="h-8 w-9 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
