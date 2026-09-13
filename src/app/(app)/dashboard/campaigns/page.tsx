'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchBroadcasts,
  createNewBroadcast,
  triggerBroadcast,
  getAudienceCount,
} from '@/lib/actions/broadcast-actions';
import { getCreditsBalance } from '@/lib/actions/credit-actions';
import { formatPaise, MESSAGE_COSTS_PAISE } from '@/lib/utils/credit-packs';
import type { Broadcast } from '@/lib/services/broadcast-service';
import { toast } from 'sonner';
import {
  Megaphone,
  Send,
  Plus,
  X,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Coins,
} from 'lucide-react';
import { getCurrentRestaurant } from '@/lib/actions/restaurant-actions';
import { getBusinessTypeConfig } from '@/lib/utils/business-types';
import { StatusPill, type StatusTone } from '@/components/dashboard/status-pill';
import { EmptyState } from '@/components/dashboard/empty-state';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: '👥 All Customers', desc: 'Every customer who has ever messaged' },
  { value: 'active', label: '🟢 Active (30 days)', desc: 'Ordered in the last 30 days' },
  { value: 'inactive', label: '💤 Inactive (60+ days)', desc: 'No orders in 60+ days — win them back!' },
  { value: 'vip', label: '⭐ VIP (5+ orders)', desc: 'Your most loyal customers' },
] as const;

const STATUS_TONES: Record<string, StatusTone> = {
  draft: 'muted',
  sending: 'warning',
  sent: 'success',
  failed: 'destructive',
};

export default function CampaignsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [businessType, setBusinessType] = useState<string>('food_beverage');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const refreshCredits = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const balance = await getCreditsBalance(restaurantId);
      setCreditBalance(balance);
    } catch (err) {
      console.error('Failed to load credit balance:', err);
    }
  }, [restaurantId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getCurrentRestaurant();
        if (r?.business_type) setBusinessType(r.business_type as string);
        if (r?.id) setRestaurantId(r.id as string);
      } catch (err) {
        console.error('Failed to load business type:', err);
      }
    })();
  }, []);

  // Broadcasts spend 78p (marketing rate) per recipient — live balance in the header
  useEffect(() => {
    if (!restaurantId) return;
    const t = setTimeout(() => void refreshCredits(), 0);
    return () => clearTimeout(t);
  }, [restaurantId, refreshCredits]);

  const config = getBusinessTypeConfig(businessType);
  const terms = config.terms;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBroadcasts();
      setBroadcasts(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError('Could not load. Please retry.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      loadData();
    })();
  }, [loadData]);

  const handleRetry = () => {
    setError(null);
    loadData();
  };

  const handleSend = async (id: string) => {
    const confirmed = window.confirm(`Send this broadcast to all targeted ${terms.customers.toLowerCase()}? This cannot be undone.`);
    if (!confirmed) return;

    toast.loading('Sending broadcast...', { id: 'broadcast-send' });
    const result = await triggerBroadcast(id);
    toast.dismiss('broadcast-send');
    void refreshCredits();

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Broadcast campaign launched!');
      loadData();
    }
  };

  const sentCount = broadcasts.filter((b) => b.status === 'sent').length;
  const totalReach = broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Broadcast Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Send WhatsApp broadcasts & promotional messages to your {terms.customers.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Credit balance chip — broadcasts spend 1 credit per recipient */}
          <Link
            href="/dashboard/settings?tab=payments"
            title="Each broadcast costs 78p per customer (marketing rate) — buy more in Settings → Payments"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm transition-colors hover:bg-secondary"
          >
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold font-mono tabular-nums">
              {creditBalance === null ? '…' : formatPaise(creditBalance)}
            </span>
            <span className="text-muted-foreground">balance</span>
            <span className="font-medium text-primary">Buy</span>
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="stamp inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Campaigns</p>
          <p className="text-2xl font-bold font-mono tabular-nums">{broadcasts.length}</p>
        </div>
        <div className="bg-card border border-success/25 rounded-2xl p-4">
          <p className="text-xs text-success">Sent</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-success">{sentCount}</p>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl p-4">
          <p className="text-xs text-primary">Total Reach</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-primary">{totalReach}</p>
        </div>
      </div>

      {/* Broadcast List */}
      {error && !broadcasts.length ? (
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-border/50 bg-card animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first broadcast to reach your customers on WhatsApp."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first broadcast →
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {broadcasts.map((bc) => (
            <div
              key={bc.id}
              className="bg-card border border-border/50 rounded-2xl p-4 hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Megaphone className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-medium truncate">{bc.title}</h3>
                    <StatusPill tone={STATUS_TONES[bc.status] || 'muted'}>
                      {bc.status}
                    </StatusPill>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 ml-7">{bc.message}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 ml-7 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 tabular-nums">
                      <Users className="w-3 h-3" />
                      {bc.target_audience === 'all' ? 'All' : bc.target_audience} • {bc.total_recipients} recipients
                    </span>
                    {bc.sent_count > 0 && (
                      <span className="flex items-center gap-1 text-success tabular-nums">
                        <CheckCircle2 className="w-3 h-3" />
                        {bc.sent_count} sent
                      </span>
                    )}
                    {bc.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-destructive tabular-nums">
                        <AlertCircle className="w-3 h-3" />
                        {bc.failed_count} failed
                      </span>
                    )}
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {new Date(bc.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {bc.status === 'draft' && (
                  <button
                    onClick={() => handleSend(bc.id)}
                    className="flex items-center gap-1.5 bg-success/10 text-success px-3 py-2 rounded-lg text-sm hover:bg-success/20 transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateBroadcastModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Create Broadcast Modal ─────────────────

function CreateBroadcastModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Broadcast['target_audience']>('all');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    getAudienceCount(audience).then(setAudienceCount);
  }, [audience]);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSaving(true);
    const result = await createNewBroadcast({ title, message, target_audience: audience });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Broadcast created! Click Send when ready.');
      onCreated();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">📢 New Broadcast</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Campaign Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Special Offer"
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your promotional message..."
              rows={4}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/1024 characters</p>
          </div>

          {/* Audience */}
          <div>
            <label className="text-sm font-medium block mb-2">Target Audience</label>
            <div className="space-y-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    audience === opt.value
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={opt.value}
                    checked={audience === opt.value}
                    onChange={() => setAudience(opt.value as Broadcast['target_audience'])}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {audienceCount !== null && (
              <p className="text-xs text-primary mt-2">
                📊 {audienceCount} customers will receive this broadcast
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !message.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            Create Draft
          </button>
        </div>
      </div>
    </div>
  );
}
