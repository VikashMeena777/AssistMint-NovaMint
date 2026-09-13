"use client";

// ─── WhatsApp Health section (Bahikhata) ─────────────────────
// Settings → WhatsApp Health: quality rating, messaging tier,
// display name status, two-step verification, OBA (green tick)
// eligibility + request flow — with honest copy about OBA odds.

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ExternalLink,
  Globe,
  HeartPulse,
  HelpCircle,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  checkObaEligibility,
  getAccountHealth,
  getObaStatus,
  requestOba,
} from "@/lib/actions/whatsapp-actions";
import type { ChecklistItem, PhoneHealthData } from "@/lib/actions/whatsapp-actions";
import { StatusPill } from "./status-pill";
import type { StatusTone } from "./status-pill";
import { EmptyState } from "./empty-state";

// ─── Label helpers ───────────────────────────

function qualityTone(rating: string): StatusTone {
  const r = (rating || "").toUpperCase();
  if (r === "GREEN") return "success";
  if (r === "YELLOW") return "warning";
  if (r === "RED") return "destructive";
  return "muted";
}

function tierLabel(tier: string): string {
  const t = (tier || "").toUpperCase();
  if (t.includes("UNLIMITED")) return "Unlimited unique customers / 24h";
  if (t === "TIER_250" || t === "250") return "250 unique customers / 24h";
  if (t === "TIER_1K" || t === "1K") return "1,000 unique customers / 24h";
  if (t === "TIER_10K" || t === "10K") return "10,000 unique customers / 24h";
  if (t === "TIER_100K" || t === "100K") return "100,000 unique customers / 24h";
  return tier || "Unknown";
}

function nameStatusTone(status: string): StatusTone {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED" || s === "ACCEPTED") return "success";
  if (s === "PENDING" || s === "PROCESSING" || s === "SUBMITTED") return "warning";
  if (s === "DECLINED" || s === "REJECTED") return "destructive";
  return "muted";
}

function verificationTone(status: string): StatusTone {
  const s = (status || "").toUpperCase();
  if (s === "VERIFIED" || s === "CODE_VERIFIED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "NOT_VERIFIED" || s === "UNVERIFIED") return "muted";
  return "muted";
}

function obaStatusMeta(status: string): { tone: StatusTone; label: string } {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED" || s === "VERIFIED")
    return { tone: "success", label: "Approved — verified badge active" };
  if (s === "PENDING" || s === "IN_PROGRESS" || s === "SUBMITTED")
    return { tone: "primary", label: "Under review at Meta" };
  if (s === "ELIGIBLE") return { tone: "primary", label: "Eligible to apply" };
  if (s === "REJECTED" || s === "NOT_APPROVED" || s === "DENIED")
    return { tone: "destructive", label: "Not approved" };
  if (s === "NOT_ELIGIBLE" || s === "NONE")
    return { tone: "muted", label: "Not applied yet" };
  return { tone: "muted", label: status || "Unknown" };
}

// ─── Section ─────────────────────────────────

interface WhatsAppHealthSectionProps {
  restaurantId: string;
  /** Switches the settings page to the WhatsApp connect tab */
  onGoConnect: () => void;
}

export function WhatsAppHealthSection({ restaurantId, onGoConnect }: WhatsAppHealthSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [health, setHealth] = useState<PhoneHealthData | null>(null);
  const [obaStatus, setObaStatus] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [healthRes, obaRes, eligRes] = await Promise.all([
        getAccountHealth(restaurantId),
        getObaStatus(restaurantId),
        checkObaEligibility(restaurantId),
      ]);

      if (healthRes.notConnected) {
        setNotConnected(true);
        setError(null);
      } else if (healthRes.error && !healthRes.data) {
        setError(healthRes.error);
      } else {
        setError(null);
        setNotConnected(false);
        setHealth(healthRes.data);
      }

      if (obaRes.data) setObaStatus(obaRes.data.status);
      if (eligRes.data) {
        setChecklist(eligRes.data.checklist);
        setChecklistError(null);
      } else if (eligRes.error && !eligRes.notConnected) {
        setChecklistError(eligRes.error);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load WhatsApp health:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
    setRefreshing(false);
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
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-2/3 animate-pulse rounded bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notConnected) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="WhatsApp not connected"
        description="Health, quality rating, and verification status appear here once your WhatsApp number is connected."
        action={
          <button
            onClick={onGoConnect}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            Connect WhatsApp →
          </button>
        }
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

  const oba = obaStatusMeta(obaStatus || "");
  const rating = (health?.quality_rating || "").toUpperCase();

  return (
    <div className="space-y-6">
      {/* REAL send blockers — from Meta's Health Status API */}
      {(health?.can_send_message === "BLOCKED" ||
        health?.can_send_message === "LIMITED" ||
        (health?.blockers && health.blockers.length > 0)) && (
        <div
          className={`rounded-2xl border p-6 ${
            health?.can_send_message === "BLOCKED"
              ? "border-destructive/40 bg-destructive/5"
              : "border-warning/40 bg-warning/5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`size-5 ${
                health?.can_send_message === "BLOCKED" ? "text-destructive" : "text-warning"
              }`}
            />
            <div>
              <h3 className="text-base font-semibold">
                {health?.can_send_message === "BLOCKED"
                  ? "WhatsApp messaging is BLOCKED"
                  : "WhatsApp messaging is limited"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Meta reports these exact issues — fix them in Meta Business Manager to restore
                full messaging.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {(health?.blockers || []).map((b, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {b.level}
                  </span>
                  <StatusPill
                    tone={
                      b.status === "BLOCKED"
                        ? "destructive"
                        : b.status === "LIMITED"
                          ? "warning"
                          : "success"
                    }
                  >
                    {b.status}
                  </StatusPill>
                </div>
                <p className="mt-1.5 text-sm">{b.error_description}</p>
                {b.possible_solution && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Fix:</span> {b.possible_solution}
                  </p>
                )}
              </div>
            ))}
            {(health?.additional_info || []).map((info, i) => (
              <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                • {info}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Account health */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Account health</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              How Meta rates your number — drops here can throttle your messaging.
            </p>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Quality rating */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-xs font-medium text-muted-foreground">Quality rating</p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusPill
                tone={qualityTone(rating)}
                icon={
                  rating === "YELLOW" || rating === "RED"
                    ? AlertTriangle
                    : !["GREEN", "YELLOW", "RED"].includes(rating)
                      ? HelpCircle
                      : undefined
                }
              >
                {rating || "UNKNOWN"}
              </StatusPill>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Based on how customers respond — blocks, reports, and deletions pull it down.
            </p>
          </div>

          {/* Messaging tier */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-xs font-medium text-muted-foreground">Messaging limit</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums">
              {tierLabel(health?.messaging_limit_tier || "")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Tiers rise automatically as you keep quality GREEN and add more unique customers.
            </p>
          </div>

          {/* Display name */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-xs font-medium text-muted-foreground">Display name</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{health?.verified_name || "—"}</p>
              <StatusPill tone={nameStatusTone(health?.name_status || "")}>
                {(health?.name_status || "UNKNOWN").replace(/_/g, " ")}
              </StatusPill>
            </div>
            {health?.new_display_name && health.new_name_status !== "NONE" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pending change to{" "}
                <span className="font-medium text-foreground">{health.new_display_name}</span> (
                {(health.new_name_status || "PENDING").replace(/_/g, " ").toLowerCase()}) — the
                number re-registers automatically once Meta approves it. Editing your business
                name in settings keeps this in sync.
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The name customers see above the chat. Approval is required before messaging at scale.
            </p>
          </div>

          {/* Two-step verification */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-xs font-medium text-muted-foreground">Two-step verification</p>
            <div className="mt-1.5">
              <StatusPill tone={verificationTone(health?.code_verification_status || "")}>
                {(health?.code_verification_status || "UNKNOWN").replace(/_/g, " ")}
              </StatusPill>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A PIN on the number — required for OBA verification and good hygiene regardless.
            </p>
          </div>
        </div>
      </div>

      {/* OBA — verification */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <BadgeCheck className="h-4 w-4 text-seal" />
              Official Business Account
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The green/blue tick next to your business name on WhatsApp.
            </p>
          </div>
          <StatusPill tone={oba.tone}>{oba.label}</StatusPill>
        </div>

        {/* Honest expectations */}
        <div className="mt-4 rounded-xl border border-warning/25 bg-warning/5 p-4">
          <p className="text-xs font-semibold text-warning">Before you apply — honest expectations</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Meta grants the tick only to businesses with <span className="font-medium">substantial press
            coverage</span> (news articles in publications with sizable audiences — paid listings and
            directories don&apos;t count). Most single-location businesses are not approved, and a
            denied request cannot be appealed — you wait 30 days to reapply. Verification of your
            business portfolio in Meta Business Manager is the realistic path to a verified badge; use
            the request below only if your business genuinely has press links.
          </p>
        </div>

        {/* Eligibility checklist */}
        <div className="mt-4">
          <p className="text-sm font-medium">Eligibility checklist</p>
          {checklistError ? (
            <p className="mt-2 text-xs text-muted-foreground">{checklistError}</p>
          ) : checklist.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No checklist reported by Meta for this number.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {checklist.map((item, i) => (
                <li key={`${item.label}-${i}`} className="flex items-start gap-2 text-sm">
                  {item.met === true ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : item.met === false ? (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <span
                      className={
                        item.met === false
                          ? "text-muted-foreground line-through decoration-border"
                          : "text-foreground"
                      }
                    >
                      {item.label}
                    </span>
                    {item.detail ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ObaRequestForm restaurantId={restaurantId} />
      </div>
    </div>
  );
}

// ─── OBA request form ───────────────────────

function ObaRequestForm({ restaurantId }: { restaurantId: string }) {
  const [website, setWebsite] = useState("");
  const [pressUrls, setPressUrls] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (submitted) return;
    const filledPressUrls = pressUrls.map((u) => u.trim()).filter((u) => u !== "");
    if (!website.trim()) {
      toast.error("Add your business website first.");
      return;
    }
    if (filledPressUrls.length === 0) {
      toast.error("Add at least 1 press link — Meta requires evidence of notability.");
      return;
    }
    setSubmitting(true);
    const result = await requestOba(restaurantId, {
      website,
      pressUrls: filledPressUrls,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSubmitted(true);
    toast.success("Verification request submitted to Meta");
  };

  return (
    <div className="mt-5 border-t border-border/50 pt-5">
      <p className="text-sm font-medium">Request verification</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Meta reviews in a few days. Links to news coverage of your business strengthen the request.
      </p>

      {submitted ? (
        <div className="mt-3 rounded-xl border border-success/25 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">Request submitted</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            You can check the status with the refresh button above. If Meta declines, you can reapply
            after 30 days — meanwhile, business portfolio verification remains the practical route.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="oba-website" className="text-xs font-medium">
              Business website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="oba-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="flex h-9 w-full rounded-lg border border-input bg-muted/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Press links <span className="text-muted-foreground">(1–5 — news articles about your business)</span>
            </label>
            {pressUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...pressUrls];
                    updated[i] = e.target.value;
                    setPressUrls(updated);
                  }}
                  placeholder="https://newsarticle.com/your-business"
                  className="flex h-9 flex-1 rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
                {pressUrls.length > 1 ? (
                  <button
                    onClick={() => setPressUrls(pressUrls.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove press link"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {pressUrls.length < 5 ? (
              <button
                onClick={() => setPressUrls([...pressUrls, ""])}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                <Plus className="h-3 w-3" />
                Add press link
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={submit}
              disabled={submitting}
              className="stamp inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Request verification
            </button>
            <a
              href="https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              How Meta decides <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
