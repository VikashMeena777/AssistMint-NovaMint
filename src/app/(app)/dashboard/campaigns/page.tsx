"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  Send,
  X,
  Users,
  Clock,
  CheckCircle2,
  Mail,
  Eye,
  Target,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCampaigns,
  createCampaign,
  sendCampaign,
  deleteCampaign,
  getCampaignStats,
} from "@/lib/actions/campaign-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const TARGET_OPTIONS = [
  { value: "all", label: "All Customers", description: "Everyone in your customer list", icon: Users },
  { value: "active", label: "Active", description: "Customers with at least 1 order", icon: CheckCircle2 },
  { value: "inactive", label: "Inactive", description: "No orders in the last 30 days", icon: Clock },
  { value: "vip", label: "VIP", description: "Gold & Platinum loyalty tier", icon: Target },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft" },
  scheduled: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Scheduled" },
  sent: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Sent" },
  sending: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Sending..." },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<AnyData[]>([]);
  const [stats, setStats] = useState<AnyData>({});
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    message_template: "",
    target_audience: "all" as "all" | "active" | "inactive" | "vip",
    scheduled_at: "",
    coupon_code: "",
  });

  useEffect(() => {
    (async () => {
      const r = await getCurrentRestaurant();
      if (r?.id) {
        setRestaurantId(r.id as string);
        setRestaurantName((r as AnyData).name || "Your Restaurant");
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [campaignsResult, statsResult] = await Promise.all([
      getCampaigns(restaurantId),
      getCampaignStats(restaurantId),
    ]);
    setCampaigns(campaignsResult.data || []);
    setStats(statsResult);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const handleCreate = async () => {
    if (!restaurantId) return;
    if (!form.name.trim()) {
      toast.error("Enter a campaign name.");
      return;
    }
    if (!form.message_template.trim()) {
      toast.error("Enter a message template.");
      return;
    }

    setSaving(true);
    const result = await createCampaign(restaurantId, {
      name: form.name,
      message_template: form.message_template,
      target_audience: form.target_audience,
      scheduled_at: form.scheduled_at || undefined,
      coupon_code: form.coupon_code || undefined,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Campaign "${form.name}" created!`);
      setForm({ name: "", message_template: "", target_audience: "all", scheduled_at: "", coupon_code: "" });
      setShowCreate(false);
      loadData();
    }
  };

  const handleSend = async (campaignId: string, campaignName: string) => {
    if (!restaurantId) return;
    if (!confirm(`Send campaign "${campaignName}" now? This will send WhatsApp messages to all targeted customers.`)) return;

    setSendingId(campaignId);
    const result = await sendCampaign(restaurantId, campaignId);
    setSendingId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Campaign sent! ${result.sentCount} messages delivered.`);
      loadData();
    }
  };

  const handleDelete = async (campaignId: string, name: string) => {
    if (!restaurantId) return;
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    const result = await deleteCampaign(restaurantId, campaignId);
    if (result.error) toast.error(result.error as string);
    else {
      toast.success("Campaign deleted");
      loadData();
    }
  };

  // Preview message
  const previewMessage = form.message_template
    .replace("{{name}}", "Rahul")
    .replace("{{restaurant}}", restaurantName);

  const statCards = [
    { label: "Total Campaigns", value: stats.total || 0, icon: Megaphone, color: "text-foreground" },
    { label: "Messages Sent", value: stats.totalSent || 0, icon: Send, color: "text-primary" },
    { label: "Delivered", value: stats.totalDelivered || 0, icon: Mail, color: "text-emerald-500" },
    { label: "Read", value: stats.totalRead || 0, icon: Eye, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Send promotional WhatsApp messages to your customers in bulk.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Create Campaign</h3>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Weekend Special Offer"
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, target_audience: opt.value }))}
                      className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-all ${
                        form.target_audience === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <opt.icon className={`h-4 w-4 mt-0.5 ${form.target_audience === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-xs font-semibold">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Template */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Message Template
                </label>
                <textarea
                  value={form.message_template}
                  onChange={(e) => setForm((p) => ({ ...p, message_template: e.target.value }))}
                  placeholder={`Hey {{name}}! 🎉\n\nWe have an amazing offer for you at {{restaurant}}!\n\nOrder now and get 20% OFF with code SAVE20.`}
                  rows={5}
                  className="flex w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex gap-2">
                  <span
                    onClick={() => setForm((p) => ({ ...p, message_template: p.message_template + "{{name}}" }))}
                    className="cursor-pointer rounded-lg bg-card border border-border px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary/10 transition-colors"
                  >
                    {"{{name}}"}
                  </span>
                  <span
                    onClick={() => setForm((p) => ({ ...p, message_template: p.message_template + "{{restaurant}}" }))}
                    className="cursor-pointer rounded-lg bg-card border border-border px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary/10 transition-colors"
                  >
                    {"{{restaurant}}"}
                  </span>
                </div>
              </div>

              {/* Optional: Coupon + Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Attach Coupon (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.coupon_code}
                    onChange={(e) => setForm((p) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., SAVE20"
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Message Preview
              </label>
              <div className="rounded-2xl bg-[#0b141a] p-4 min-h-[200px]">
                {/* WhatsApp-style bubble */}
                <div className="max-w-[85%] ml-auto">
                  <div className="rounded-xl rounded-tr-sm bg-[#005c4b] px-3 py-2.5 shadow-sm">
                    <p className="text-sm text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                      {previewMessage || (
                        <span className="text-[#8696a0] italic">
                          Type a message to see preview...
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#8696a0] text-right mt-1">
                      {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {form.scheduled_at ? "Schedule Campaign" : "Create as Draft"}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Megaphone className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No campaigns yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Send promotional WhatsApp messages to your customers. Target active customers, re-engage inactive ones, or reward VIPs.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((camp) => {
              const status = STATUS_STYLES[camp.status] || STATUS_STYLES.draft;
              const isSending = sendingId === camp.id;

              return (
                <div
                  key={camp.id}
                  className="rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-border"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-foreground">{camp.name}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {camp.target_audience === "all" ? "All" : camp.target_audience === "active" ? "Active" : camp.target_audience === "inactive" ? "Inactive" : "VIP"}
                          {camp.target_count > 0 && ` (${camp.target_count})`}
                        </span>
                        {camp.sent_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {camp.sent_count} sent
                          </span>
                        )}
                        {camp.delivered_count > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {camp.delivered_count} delivered
                          </span>
                        )}
                        {camp.read_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {camp.read_count} read
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(camp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>

                      {camp.message_template && (
                        <p className="text-xs text-muted-foreground/70 line-clamp-1 max-w-lg">
                          {camp.message_template}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      {(camp.status === "draft" || camp.status === "scheduled") && (
                        <button
                          onClick={() => handleSend(camp.id, camp.name)}
                          disabled={isSending}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                        >
                          {isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {isSending ? "Sending..." : "Send Now"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(camp.id, camp.name)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete campaign"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
