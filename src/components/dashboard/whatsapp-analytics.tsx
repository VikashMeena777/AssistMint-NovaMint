"use client";

// ─── WhatsApp delivery & cost section (Bahikhata) ────────────
// Self-contained analytics section: loads WABA analytics for the
// last 30 days, renders sent/delivered charts (recharts, lazily
// loaded), conversation counts by category, template performance,
// and spend — with graceful not-connected / no-data states.

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FileText, MessageSquare, RefreshCw } from "lucide-react";
import { getAnalytics } from "@/lib/actions/whatsapp-actions";
import type { WhatsAppAnalyticsData } from "@/lib/actions/whatsapp-actions";
import { EmptyState, EmptyStateLink } from "./empty-state";

// recharts is heavy — load it lazily (client-only), matching the
// dashboard charts-impl pattern.
const WhatsAppChartsImpl = dynamic(() => import("./whatsapp-analytics-impl"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="mb-6 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
      ))}
    </div>
  ),
});

const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function WhatsAppAnalyticsSection({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [data, setData] = useState<WhatsAppAnalyticsData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalytics(restaurantId, 30);
      if (result.error && result.notConnected) {
        setNotConnected(true);
        setError(null);
      } else if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setNotConnected(false);
        setData(result.data);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load WhatsApp analytics:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      load();
    })();
  }, [load]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-72 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/60" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-border/50 bg-card p-6">
              <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notConnected) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="WhatsApp not connected"
        description="Delivery, conversation, and cost charts for your WhatsApp number appear here after you connect."
        action={<EmptyStateLink href="/dashboard/settings?tab=whatsapp">Connect WhatsApp →</EmptyStateLink>}
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={handleRetry}
          className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-secondary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const noData =
    !data ||
    (data.messaging.length === 0 && data.categories.length === 0 && data.templates.length === 0);

  if (noData) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No WhatsApp data yet"
        description="Meta needs a few days of messaging before analytics appear. Send your first campaigns and check back."
        action={
          <button
            onClick={handleRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />
    );
  }

  const maxCategoryConversations = Math.max(...data.categories.map((c) => c.conversations), 1);
  const totalConversations = data.categories.reduce((sum, c) => sum + c.conversations, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">WhatsApp delivery &amp; cost</h2>
          <p className="text-sm text-muted-foreground">
            {totalConversations > 0
              ? `${totalConversations.toLocaleString("en-IN")} conversations`
              : "Conversations"}{" "}
            · last 30 days
            {data.totalCost > 0 ? ` · ${formatRupees(data.totalCost)} spend` : ""}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Charts (recharts, lazy) */}
      <WhatsAppChartsImpl messaging={data.messaging} costByDay={data.costByDay} />

      {/* Categories + partial errors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Conversations by category (30 days)</h3>
          </div>
          {data.categories.length > 0 ? (
            <div className="space-y-3">
              {data.categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize">{cat.category.toLowerCase()}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {cat.conversations.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max((cat.conversations / maxCategoryConversations) * 100, 2)}%` }}
                    />
                  </div>
                  {cat.cost > 0 ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatRupees(cat.cost)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversation data for this period.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Template performance (30 days)</h3>
          </div>
          {data.templates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Template</th>
                    <th className="pb-2 pr-3 text-right font-medium">Sent</th>
                    <th className="pb-2 pr-3 text-right font-medium">Delivered</th>
                    <th className="pb-2 text-right font-medium">Read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.templates.map((t) => {
                    const readRate = t.sent > 0 ? Math.round((t.read / t.sent) * 100) : 0;
                    return (
                      <tr key={t.name}>
                        <td className="max-w-[180px] truncate py-2.5 pr-3 font-medium">{t.name}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.sent}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.delivered}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {t.read}
                          <span className="ml-1 text-[10px] text-muted-foreground">({readRate}%)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No template messages sent in this period.
            </p>
          )}
        </div>
      </div>

      {/* Partial errors — honest but quiet */}
      {data.partialErrors.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Some metrics were unavailable: {data.partialErrors.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
