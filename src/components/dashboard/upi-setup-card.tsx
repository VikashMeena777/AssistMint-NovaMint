"use client";

// ─── UPI setup card (Bahikhata) ──────────────────────────────
// The ONE setting behind in-chat payments: the business's UPI ID.
// Saved to business_config.upi_vpa; the bot then sends a native
// "Pay Online" invoice inside WhatsApp (see the orchestrator's
// handleOnlinePayOrder). Plain owner language only — no jargon.

import { useState } from "react";
import { CheckCircle2, Loader2, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { saveUpiVpa } from "@/lib/actions/restaurant-actions";
import { StatusPill } from "@/components/dashboard/status-pill";

interface UpiSetupCardProps {
  restaurantId: string;
  /** Current UPI ID from business_config.upi_vpa, if set. */
  initialUpiVpa: string | null;
}

export function UpiSetupCard({ restaurantId, initialUpiVpa }: UpiSetupCardProps) {
  const [upiId, setUpiId] = useState(initialUpiVpa || "");
  const [savedUpiId, setSavedUpiId] = useState(initialUpiVpa || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const clean = upiId.trim();
    if (clean && !clean.includes("@")) {
      toast.error("That doesn't look like a UPI ID — it should look like yourname@bank (e.g. vikash@okhdfcbank).");
      return;
    }
    setSaving(true);
    try {
      const result = await saveUpiVpa(restaurantId, clean);
      if (result.error) {
        toast.error(result.error);
      } else {
        setSavedUpiId(clean);
        if (clean) {
          toast.success("Saved! Customers can now pay inside WhatsApp 💬");
        } else {
          toast.info("Removed — customers will get a payment link instead.");
        }
      }
    } catch {
      toast.error("Could not save. Please try again.");
    }
    setSaving(false);
  };

  const isSet = savedUpiId.trim() !== "";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Receive payments in chat (UPI)</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Add your UPI ID once and customers can pay you right inside WhatsApp — no separate
            payment app setup needed. This is the simplest way to take online payments.
          </p>
        </div>
        <Smartphone className="h-5 w-5 shrink-0 text-primary" />
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="upi-vpa" className="text-sm font-medium">
          Your UPI ID
        </label>
        <input
          id="upi-vpa"
          type="text"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="e.g. vikash@okhdfcbank"
          autoComplete="off"
          className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Not sure? Open any UPI app (GPay, PhonePe, Paytm) → tap your profile → copy your UPI ID.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save UPI ID"}
        </button>
        <StatusPill tone={isSet ? "success" : "muted"} icon={isSet ? CheckCircle2 : undefined}>
          {isSet ? `Set — ${savedUpiId}` : "Not set"}
        </StatusPill>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {isSet
          ? "Customers can now pay inside WhatsApp — when they choose Pay Online, they'll see a UPI invoice in chat."
          : "Not set — customers get a payment link instead."}
      </p>
    </div>
  );
}
