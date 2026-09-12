"use client";

// recharts is a heavy dependency — load it lazily (client-only) with a
// static skeleton that matches the final two-card chart layout, so the
// dashboard bundle doesn't pay for charts on first paint.

import dynamic from "next/dynamic";

const ChartsImpl = dynamic(() => import("./charts-impl"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
});

interface ChartData {
  date: string;
  sales: number;
  orders: number;
  chats: number;
}

interface DashboardChartsProps {
  data: ChartData[];
}

/** Static skeleton (no shimmer) matching the final chart layout */
function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-52 rounded bg-muted/60" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-64 w-full rounded-xl bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  return <ChartsImpl data={data} />;
}
