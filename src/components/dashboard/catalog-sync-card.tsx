"use client";

// ─── Catalog sync card (Bahikhata) ───────────────────────────
// Pushes active menu items to the WhatsApp catalog on Meta and
// enables the in-chat cart. Shows per-item results and the last
// synced time (persisted in business_config).

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { syncCatalogToMeta } from "@/lib/actions/whatsapp-actions";
import type { CatalogSyncResult } from "@/lib/actions/whatsapp-actions";

interface CatalogSyncCardProps {
  restaurantId: string;
  initialLastSyncedAt: string | null;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never synced";
  return `Last synced ${d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function CatalogSyncCard({ restaurantId, initialLastSyncedAt }: CatalogSyncCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<CatalogSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await syncCatalogToMeta(restaurantId);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else if (res.data) {
        setResult(res.data);
        setLastSyncedAt(res.data.lastSyncedAt);
        if (res.data.total === 0) {
          toast.info("No available menu items to sync yet.");
        } else if (res.data.failed > 0) {
          toast.warning(`${res.data.synced} of ${res.data.total} items synced — some failed.`);
        } else {
          toast.success(`${res.data.synced} items synced to WhatsApp 🛍️`);
        }
      }
    } catch {
      setError("Sync failed. Please retry.");
      toast.error("Sync failed. Please retry.");
    }
    setSyncing(false);
  };

  const failedItems = result ? result.results.filter((r) => r.status === "failed") : [];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">WhatsApp catalog</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Send your menu as a native catalog — customers browse items and build a cart right inside
            WhatsApp. Re-sync after menu changes; prices sync as-is from your menu.
          </p>
        </div>
        <ShoppingBag className="h-5 w-5 shrink-0 text-primary" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={sync}
          disabled={syncing}
          className="stamp inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? "Syncing…" : "Sync your catalog to WhatsApp"}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">{formatSyncTime(lastSyncedAt)}</span>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
          <button onClick={sync} disabled={syncing} className="mt-2 text-xs font-medium text-destructive hover:underline">
            Retry sync
          </button>
        </div>
      ) : null}

      {result && !error ? (
        <div className="mt-4 space-y-3">
          {result.total === 0 ? (
            <p className="rounded-xl border border-border/40 bg-muted/10 p-3.5 text-xs leading-relaxed text-muted-foreground">
              No available menu items to sync. Add items in Menu first, then come back.
            </p>
          ) : (
            <>
              {/* Summary */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border/40 bg-muted/10 p-3.5 text-xs">
                <span className="font-semibold tabular-nums">
                  {result.synced} of {result.total} items synced
                </span>
                {result.failed === 0 ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All good
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive tabular-nums">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {result.failed} failed
                  </span>
                )}
                {result.commerceSettings ? (
                  <span className="text-muted-foreground">In-chat cart enabled</span>
                ) : (
                  <span className="text-muted-foreground">Cart setting could not be updated</span>
                )}
              </div>

              {/* Per-item failures */}
              {failedItems.length > 0 ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3.5">
                  <p className="text-xs font-semibold text-destructive">Failed items</p>
                  <ul className="mt-2 space-y-1.5">
                    {failedItems.map((item, i) => (
                      <li key={`${item.name}-${i}`} className="text-xs leading-relaxed">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-muted-foreground"> — {item.error || "unknown error"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
