"use client";

// ============================================
// AssistMint — Growth Playbook (CTWA ads)
// Guidance for click-to-WhatsApp ads + the
// 72h Free Entry Point window + ice breakers.
// ============================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getCurrentRestaurant,
  updateRestaurantSettings,
} from "@/lib/actions/restaurant-actions";
import {
  Megaphone,
  Gift,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Save,
  Loader2,
  Zap,
} from "lucide-react";

const DEFAULT_ICEBREAKERS = [
  "Hi! I'd like to place an order 🍽",
  "Do you have a table free tonight?",
  "What are today's specials?",
  "I'd like to book an appointment",
];

export default function GrowthPlaybookPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [icebreakers, setIcebreakers] = useState<string[]>(DEFAULT_ICEBREAKERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const r = await getCurrentRestaurant();
      if (!r) {
        setError("Could not load your business. Please retry.");
        return;
      }
      setRestaurantId(r.id as string);
      
      setWaPhone((r.phone as string) || "");
      const saved = (r.business_config as Record<string, unknown> | null)?.icebreakers as
        | string[]
        | undefined;
      if (saved?.length) setIcebreakers(saved);
    } catch {
      setError("Could not load your business. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const saveIcebreakers = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const r = await getCurrentRestaurant();
      const config = (r?.business_config as Record<string, unknown> | null) || {};
      const res = await updateRestaurantSettings(restaurantId, {
        business_config: { ...config, icebreakers },
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Ice breakers saved — they'll appear on your ads");
      }
    } catch {
      toast.error("Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const adChatLink = waPhone ? `https://wa.me/${waPhone.replace(/\D/g, "")}` : "";

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error && !restaurantId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 rounded-xl border px-4 py-2 text-sm transition-colors hover:bg-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-24 lg:pb-6">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Growth Playbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get new customers chatting with your AI on WhatsApp — ads, QR codes and free
          messaging windows, explained simply.
        </p>
      </header>

      {/* ── The 72h free window ── */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary">
            <Gift className="size-4 text-foreground" />
          </span>
          <h2 className="font-heading text-lg font-semibold">The 72-hour free window</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          When someone messages you from a <strong className="text-foreground">click-to-WhatsApp ad</strong>{" "}
          (or a Facebook Page button on mobile), WhatsApp opens a{" "}
          <strong className="text-foreground">Free Entry Point window</strong>: for the
          next 72 hours, <strong className="text-foreground">every message is free</strong>{" "}
          — including the templates that normally cost per message. Your AI can answer,
          follow up, and close the order at zero messaging cost.
        </p>
        <div className="mt-4 rule-y rounded-xl bg-secondary/40 px-4 py-3 text-sm">
          <span className="font-medium">Why this matters:</span> ad-driven customers are
          the cheapest to serve on WhatsApp — make sure your ads point at your WhatsApp
          number, not your website.
        </div>
      </section>

      {/* ── Run your first CTWA ad ── */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary">
            <Megaphone className="size-4 text-foreground" />
          </span>
          <h2 className="font-heading text-lg font-semibold">Run a click-to-WhatsApp ad</h2>
        </div>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2.5">
            <span className="font-heading font-semibold text-foreground">1.</span>
            <span>
              Open <strong className="text-foreground">Meta Ads Manager</strong> → Create
              campaign → objective <em>Engagement</em> or <em>Sales</em>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-heading font-semibold text-foreground">2.</span>
            <span>
              At ad setup, choose <strong className="text-foreground">Click to Message</strong>{" "}
              → <strong className="text-foreground">WhatsApp</strong> → select your
              business number.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-heading font-semibold text-foreground">3.</span>
            <span>
              Set 2–4 <strong className="text-foreground">ice breakers</strong> (below) —
              the tappable quick-replies the customer sees when the chat opens. Your AI
              takes it from there.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-heading font-semibold text-foreground">4.</span>
            <span>
              Budget ₹150–300/day to start; target your city + interest (e.g. &ldquo;food
              delivery&rdquo; for restaurants). Kill the ad if cost-per-chat exceeds one
              menu item&rsquo;s margin.
            </span>
          </li>
        </ol>
        {adChatLink && (
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Your chat link for ad previews:
            <a
              href={adChatLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
            >
              {adChatLink}
              <ExternalLink className="size-3" />
            </a>
          </p>
        )}
      </section>

      {/* ── Ice breakers ── */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-secondary">
              <MessageSquare className="size-4 text-foreground" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">Ice breakers</h2>
              <p className="text-xs text-muted-foreground">
                Quick-reply buttons on your ads and WhatsApp entry points
              </p>
            </div>
          </div>
          <button
            onClick={() => void saveIcebreakers()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground stamp transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          {icebreakers.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <input
                value={text}
                onChange={(e) => {
                  const next = [...icebreakers];
                  next[i] = e.target.value;
                  setIcebreakers(next);
                }}
                maxLength={60}
                className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none transition-colors focus:border-primary/50"
              />
              <button
                onClick={() => setIcebreakers(icebreakers.filter((_, j) => j !== i))}
                aria-label={`Remove ice breaker ${i + 1}`}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          {icebreakers.length < 4 && (
            <button
              onClick={() => setIcebreakers([...icebreakers, ""])}
              className="rounded-xl border border-dashed px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              + Add ice breaker
            </button>
          )}
        </div>
      </section>

      {/* ── Free growth channels ── */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary">
            <Zap className="size-4 text-foreground" />
          </span>
          <h2 className="font-heading text-lg font-semibold">Free growth channels</h2>
        </div>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-seal" />
            <span>
              <strong className="text-foreground">Table & counter QR codes</strong> — print
              from Dashboard → WhatsApp → QR Codes; every scan starts a free chat with a
              prefilled message.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-seal" />
            <span>
              <strong className="text-foreground">Your wa.me link</strong> — put it in your
              Instagram bio, Google Business profile, and shop sign. Scanning chats are
              free customer-service windows.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-seal" />
            <span>
              <strong className="text-foreground">Status/broadcast asks</strong> — ask happy
              customers to save your number; broadcasts to opted-in regulars land in
              marketing-rate messages, but replies open free 24h windows.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
