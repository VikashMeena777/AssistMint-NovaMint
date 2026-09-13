"use client";

// ─── QR code card (Bahikhata) ─────────────────────────────────
// One API-generated WhatsApp QR: scannable image (rendered
// server-side to a PNG data URI), download, copy link, and an
// inline editor for the pre-filled message — editable without
// reprinting, since the QR encodes the wa.me short link.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { generateQr, updateQr } from "@/lib/actions/whatsapp-actions";
import type { QrCodeItem } from "@/lib/actions/whatsapp-actions";

interface QrCodeCardProps {
  restaurantId: string;
  qr: QrCodeItem;
  onUpdated: (qr: QrCodeItem) => void;
}

export function QrCodeCard({ restaurantId, qr, onUpdated }: QrCodeCardProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(qr.prefilledText);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadImage = useCallback(async () => {
    setImageLoading(true);
    setImageError(null);
    try {
      const result = await generateQr(restaurantId, qr.link);
      if (result.error) setImageError(result.error);
      else setImage(result.data);
    } catch {
      setImageError("Could not render the QR image.");
    }
    setImageLoading(false);
  }, [restaurantId, qr.link]);

  useEffect(() => {
    void (async () => {
      loadImage();
    })();
  }, [loadImage]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qr.link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — long-press the link instead.");
    }
  };

  const saveEdit = async () => {
    const text = editValue.trim();
    if (!text) {
      toast.error("The pre-filled message cannot be empty.");
      return;
    }
    setSaving(true);
    const result = await updateQr(restaurantId, qr.code, text);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Pre-filled message updated — no reprint needed ✨");
    setEditing(false);
    onUpdated({ ...qr, prefilledText: text });
  };

  const created = qr.createdAt ? new Date(qr.createdAt) : null;

  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      {/* QR image — white plate so the code scans off ivory paper */}
      <div className="flex items-center justify-center rounded-xl border border-border/40 bg-white p-3">
        {imageLoading ? (
          <div className="flex h-40 w-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : imageError || !image ? (
          <div className="flex h-40 w-40 flex-col items-center justify-center px-4 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {imageError || "QR image unavailable."}
            </p>
            <button onClick={loadImage} className="mt-2 text-xs font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt={`WhatsApp QR ${qr.code}`} className="h-40 w-40" />
        )}
      </div>

      {/* Details */}
      <div className="mt-4 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-xs text-muted-foreground">wa.me/message/{qr.code}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
            {created && !Number.isNaN(created.getTime())
              ? created.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : ""}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          &ldquo;{qr.prefilledText || "No pre-filled message"}&rdquo;
        </p>
      </div>

      {/* Inline edit or actions */}
      {editing ? (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium" htmlFor={`qr-edit-${qr.code}`}>
            Pre-filled message (what the customer sends on scan)
          </label>
          <input
            id={`qr-edit-${qr.code}`}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            maxLength={140}
            className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
          <p className="text-right text-[11px] text-muted-foreground tabular-nums">
            {editValue.length}/140
          </p>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="stamp inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditValue(qr.prefilledText);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {image ? (
            <a
              href={image}
              download={`whatsapp-qr-${qr.code}.png`}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-3 w-3" />
              PNG
            </a>
          ) : null}
          <button
            onClick={copyLink}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
