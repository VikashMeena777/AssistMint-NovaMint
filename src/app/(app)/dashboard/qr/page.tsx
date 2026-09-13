"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Plus, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";
import { createQr, getQrCodes } from "@/lib/actions/whatsapp-actions";
import type { QrCodeItem } from "@/lib/actions/whatsapp-actions";
import { EmptyState, EmptyStateLink } from "@/components/dashboard/empty-state";
import { QrCodeCard } from "@/components/dashboard/qr-code-card";

// Suggested pre-filled messages per business type — the message the
// customer sends when they scan, so it should read like the customer.
const PREFILLED_EXAMPLES: Record<string, string[]> = {
  food_beverage: [
    "Hi! I'd like to order 🍽️",
    "Hi! Can I see the menu? 📋",
    "Hi! I'm at table 4 🪑",
  ],
  salon_spa: [
    "Hi! I'd like to book an appointment 💇",
    "Hi! What services do you offer?",
  ],
  healthcare: [
    "Hi! I'd like to book an appointment 🩺",
    "Hi! What are your timings?",
  ],
  education: [
    "Hi! I'd like to know about your courses 📚",
    "Hi! Can I book a demo class?",
  ],
  retail: [
    "Hi! I'd like to ask about a product 🛍️",
    "Hi! Do you have this in stock?",
  ],
  services: [
    "Hi! I'd like to book a service 🛠️",
    "Hi! What's your visiting charge?",
  ],
};

export default function QrStudioPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState("food_beverage");
  const [qrCodes, setQrCodes] = useState<QrCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPrefilled, setNewPrefilled] = useState("");
  const createInputRef = useRef<HTMLInputElement | null>(null);

  const loadRestaurant = useCallback(async () => {
    try {
      const r = await getCurrentRestaurant();
      if (r?.id) {
        setRestaurantId(r.id as string);
        setBusinessType((r.business_type as string) || "food_beverage");
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load restaurant:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      loadRestaurant();
    })();
  }, [loadRestaurant]);

  const loadQrs = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const result = await getQrCodes(restaurantId);
      if (result.error && result.notConnected) {
        setNotConnected(true);
        setError(null);
      } else if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setNotConnected(false);
        setQrCodes(result.data || []);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load QR codes:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      if (restaurantId) loadQrs();
    })();
  }, [restaurantId, loadQrs]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    if (restaurantId) loadQrs();
    else loadRestaurant();
  };

  const examples = PREFILLED_EXAMPLES[businessType] || PREFILLED_EXAMPLES.food_beverage;

  const handleCreate = async () => {
    if (!restaurantId) return;
    const text = newPrefilled.trim();
    if (!text) {
      toast.error("Write the message customers will send when they scan.");
      return;
    }
    setCreating(true);
    const result = await createQr(restaurantId, text);
    setCreating(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("QR code created 🎉 Print it, stick it, done.");
    setNewPrefilled("");
    if (result.data) setQrCodes((prev) => [result.data as QrCodeItem, ...prev]);
  };

  const handleQrUpdated = (updated: QrCodeItem) => {
    setQrCodes((prev) => prev.map((q) => (q.code === updated.code ? updated : q)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">QR Codes</h1>
          <p className="text-sm text-muted-foreground">
            Turn tables, counters, and packaging into WhatsApp conversations.
          </p>
        </div>
        <button
          onClick={() => {
            if (notConnected) return;
            if (restaurantId) loadQrs();
          }}
          disabled={loading || notConnected}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-base font-semibold">Print once, edit anytime</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { title: "Counter", body: "Prop one at the register so walk-ins can start a chat in a tap." },
            { title: "Tables", body: "Sticker per table — the pre-filled message can carry the table number." },
            { title: "Packaging", body: "Print on delivery bags and boxes so every order becomes a repeat chat." },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
              <p className="text-sm font-semibold">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Scanning opens WhatsApp with your number and the message pre-typed — the customer just presses
          send. Chats that start from a QR open a free 24-hour reply window, and you can edit the
          pre-filled message any time without reprinting (the QR itself points at a short link that
          never changes).
        </p>
      </div>

      {/* Error */}
      {error && !loading ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="h-46 w-full animate-pulse rounded-xl bg-muted/40" />
              <div className="mt-4 h-3 w-32 animate-pulse rounded bg-muted/60" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="mt-4 flex gap-2">
                <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
                <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
                <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      ) : notConnected ? (
        <EmptyState
          icon={MessageSquare}
          title="WhatsApp not connected"
          description="QR codes need a connected WhatsApp number so scans can open a chat with your business."
          action={<EmptyStateLink href="/dashboard/settings?tab=whatsapp">Connect WhatsApp →</EmptyStateLink>}
        />
      ) : (
        <>
          {/* Create */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">New QR code</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pick the message customers will send when they scan — keep it short and friendly.
                </p>
              </div>
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 space-y-2">
              <label htmlFor="qr-prefilled" className="text-sm font-medium">
                Pre-filled message
              </label>
              <input
                ref={createInputRef}
                id="qr-prefilled"
                type="text"
                value={newPrefilled}
                onChange={(e) => setNewPrefilled(e.target.value)}
                maxLength={140}
                placeholder={examples[0]}
                className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                {newPrefilled.length}/140
              </p>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Suggestions for your business:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => setNewPrefilled(example)}
                    disabled={newPrefilled === example}
                    className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium hover:border-primary/50 hover:text-primary disabled:opacity-40 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="stamp mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create QR code
            </button>
          </div>

          {/* List */}
          {qrCodes.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="No QR codes yet"
              description="Create your first QR — print it on your counter, tables, or packaging so customers can start a chat with one scan."
              action={
                <button
                  onClick={() => createInputRef.current?.focus()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Create your first QR
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {qrCodes.map((qr) => (
                <QrCodeCard
                  key={qr.code}
                  restaurantId={restaurantId || ""}
                  qr={qr}
                  onUpdated={handleQrUpdated}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
