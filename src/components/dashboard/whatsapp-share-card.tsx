"use client";

// ─── Share your WhatsApp card (Bahikhata) ────────────────────
// wa.me deep links for the business number: chat link with a
// pre-typed "Hi" and the catalog deep link. Copy to clipboard,
// or open to verify.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MessageSquare, Share2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { getShareLinks } from "@/lib/actions/whatsapp-actions";
import type { ShareLinksData } from "@/lib/actions/whatsapp-actions";

export function WhatsAppShareCard({ restaurantId }: { restaurantId: string }) {
  const [links, setLinks] = useState<ShareLinksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"chat" | "catalog" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getShareLinks(restaurantId);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setLinks(result.data);
      }
    } catch {
      setError("Could not load your share links.");
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      load();
    })();
  }, [load]);

  const copy = async (key: "chat" | "catalog", label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copied`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error("Could not copy — select the link and copy manually.");
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Share your WhatsApp</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One-tap links for your Google listing, Instagram bio, and bill receipts.
          </p>
        </div>
        <Share2 className="h-5 w-5 shrink-0 text-primary" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-4 rounded-xl border border-border/40 bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
          {error}
        </p>
      ) : links ? (
        <div className="mt-4 space-y-3">
          <LinkRow
            icon={MessageSquare}
            label="Chat link"
            note="Opens a chat with “Hi” pre-typed."
            value={links.chatLink}
            copied={copiedKey === "chat"}
            onCopy={() => copy("chat", "Chat link", links.chatLink)}
          />
          <LinkRow
            icon={ShoppingBag}
            label="Catalog link"
            note="Opens your WhatsApp catalog — sync it with the card below."
            value={links.catalogLink}
            copied={copiedKey === "catalog"}
            onCopy={() => copy("catalog", "Catalog link", links.catalogLink)}
          />
        </div>
      ) : null}
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  note,
  value,
  copied,
  onCopy,
}: {
  icon: typeof MessageSquare;
  label: string;
  note: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs font-semibold">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
          <button
            onClick={onCopy}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium hover:bg-muted transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <code className="mt-2 block break-all font-mono text-xs text-muted-foreground">{value}</code>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
