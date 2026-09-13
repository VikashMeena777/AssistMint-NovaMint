"use client";

// ─── Credits card (Bahikhata) ─────────────────────────────────
// Prepaid message credits for business-initiated WhatsApp sends
// (broadcasts, win-backs, review asks). Customer replies inside
// the 24h window stay free. Shows the wallet balance, three
// top-up packs, and the recent transaction ledger.

import { useCallback, useEffect, useState } from "react";
import { Coins, ExternalLink, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { buyCredits, verifyCreditsPayment, getCreditsOverview } from "@/lib/actions/credit-actions";
// Types come from the service/packs modules — NEVER from the 'use server'
// credit-actions file (type re-exports there crash the compiled chunk).
import type { CreditTransaction } from "@/lib/services/credit-service";
import { CREDIT_PACKS, MESSAGE_COSTS_PAISE, formatPaise } from "@/lib/utils/credit-packs";
import type { CreditPackId } from "@/lib/utils/credit-packs";

const REASON_LABELS: Record<string, string> = {
  purchase: "Purchase",
  campaign: "Campaign",
  broadcast: "Broadcast",
  business_message: "Business message",
  refund: "Refund",
  bonus: "Bonus",
};

interface CreditsCardProps {
  restaurantId: string;
}

export function CreditsCard({ restaurantId }: CreditsCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState<CreditPackId | null>(null);
  const [awaitingOrder, setAwaitingOrder] = useState<string | null>(null);
  const loadOverview = useCallback(async () => {
    try {
      const result = await getCreditsOverview(restaurantId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setBalance(result.balance);
      setTransactions(result.transactions);
    } catch {
      toast.error("Could not load credits. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const t = setTimeout(() => void loadOverview(), 0);
    return () => clearTimeout(t);
  }, [loadOverview]);

  const handleBuy = async (packId: CreditPackId) => {
    if (awaitingOrder) {
      toast.info("Finish or wait for the current purchase first.");
      return;
    }
    setBuyingPack(packId);
    try {
      const result = await buyCredits(restaurantId, packId);
      if ("error" in result) {
        toast.error(result.error);
        setBuyingPack(null);
        return;
      }
      setAwaitingOrder(result.cfOrderId);
      setBuyingPack(null);

      // Cashfree JS SDK checkout — an IN-PAGE modal. (The old flow opened a
      // new tab via window.open after an async round-trip, which browsers
      // popup-block; the modal can't be blocked.)
      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
      });
      await cashfree.checkout({
        paymentSessionId: result.paymentSessionId,
        redirectTarget: "_modal",
      });

      // Modal closed — check whether the payment actually went through
      // (success AND user-close land here; the webhook may already have
      // fulfilled it).
      const verify = await verifyCreditsPayment(restaurantId, result.cfOrderId);
      if (verify.success) {
        toast.success("Message balance added 🎉");
      } else if (verify.error && !verify.pending) {
        toast.error(verify.error);
      } else {
        toast.info(
          "Payment not finished — if you already paid, the balance appears here within a minute."
        );
      }
      await loadOverview();
    } catch {
      toast.error("Could not start the purchase. Please try again.");
      setBuyingPack(null);
      setAwaitingOrder(null);
    }
  };

  const packs = Object.values(CREDIT_PACKS);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Message credits</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Your message balance works like a prepaid talktime — every promotion costs
            {" "}{formatPaise(MESSAGE_COSTS_PAISE.marketing)} and every reminder costs{" "}
            {formatPaise(MESSAGE_COSTS_PAISE.utility)} (Meta&apos;s rates). Customer replies in the
            24-hour window are always free.
          </p>
        </div>
        <Coins className="h-5 w-5 shrink-0 text-primary" />
      </div>

      {/* Balance */}
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 p-4">
        {loading ? (
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        ) : (
          <p className="text-3xl font-bold font-mono tabular-nums leading-none">
            {formatPaise(balance ?? 0)}
          </p>
        )}
        <span className="pb-0.5 text-xs font-medium text-muted-foreground">message balance</span>
      </div>

      {/* Packs */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
              pack.id === "growth"
                ? "border-primary/40 bg-primary/5"
                : "border-border/50 bg-muted/10"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{pack.name}</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {formatPaise(pack.balancePaise)}
              </p>
              <p className="text-xs text-muted-foreground">message balance</p>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                ≈ {Math.floor(pack.balancePaise / MESSAGE_COSTS_PAISE.marketing)} promotions or{" "}
                {Math.floor(pack.balancePaise / MESSAGE_COSTS_PAISE.utility)} reminders
              </p>
            </div>
            <button
              onClick={() => handleBuy(pack.id)}
              disabled={buyingPack !== null || awaitingOrder !== null}
              className="stamp mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {buyingPack === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {buyingPack === pack.id ? "Starting…" : `${formatPaise(pack.pricePaise)} · Buy`}
            </button>
          </div>
        ))}
      </div>

      {awaitingOrder ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          Waiting for your payment to complete — this page updates automatically once it&apos;s done.
        </p>
      ) : null}

      {/* Recent transactions */}
      <div className="mt-5">
        <p className="text-sm font-semibold">Recent activity</p>
        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No credit activity yet — buy a pack above and every purchase, spend, and refund will show up here.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border/50">
            {transactions.slice(0, 8).map((tx) => {
              const positive = tx.delta > 0;
              const DeltaIcon = positive ? TrendingUp : TrendingDown;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        positive
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <DeltaIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {REASON_LABELS[tx.reason] || tx.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold font-mono tabular-nums ${
                        positive ? "text-success" : "text-destructive"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {tx.delta > 0 ? "+" : ""}{formatPaise(tx.delta)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      bal {tx.balance_after.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ExternalLink className="h-3 w-3 shrink-0" />
        Credits never expire. Failed sends are automatically refunded to your balance.
      </p>
    </div>
  );
}
