'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchBroadcasts,
  createNewBroadcast,
  triggerBroadcast,
  getAudienceCount,
} from '@/lib/actions/broadcast-actions';
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
} from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: '👥 All Customers', desc: 'Every customer who has ever messaged' },
  { value: 'active', label: '🟢 Active (30 days)', desc: 'Ordered in the last 30 days' },
  { value: 'inactive', label: '💤 Inactive (60+ days)', desc: 'No orders in 60+ days — win them back!' },
  { value: 'vip', label: '⭐ VIP (5+ orders)', desc: 'Your most loyal customers' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  sending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  sent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CampaignsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchBroadcasts();
    setBroadcasts(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSend = async (id: string) => {
    const confirmed = window.confirm('Send this broadcast to all targeted customers? This cannot be undone.');
    if (!confirmed) return;

    toast.loading('Sending broadcast...', { id: 'broadcast-send' });
    const result = await triggerBroadcast(id);
    toast.dismiss('broadcast-send');

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`✅ Broadcast sent! ${result.sent} delivered, ${result.failed} failed`);
      loadData();
    }
  };

  const sentCount = broadcasts.filter((b) => b.status === 'sent').length;
  const totalReach = broadcasts.reduce((sum, b) => sum + b.sent_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Broadcast promotional messages to your customers via WhatsApp
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Campaigns</p>
          <p className="text-2xl font-bold">{broadcasts.length}</p>
        </div>
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-400">Sent</p>
          <p className="text-2xl font-bold text-emerald-400">{sentCount}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-primary">Total Reach</p>
          <p className="text-2xl font-bold text-primary">{totalReach}</p>
        </div>
      </div>

      {/* Broadcast List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-2xl">
          <div className="text-4xl mb-3">📢</div>
          <p className="text-lg font-medium mb-1">No campaigns yet</p>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first broadcast to reach your customers on WhatsApp
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" />
            Create Broadcast
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((bc) => (
            <div
              key={bc.id}
              className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Megaphone className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-medium truncate">{bc.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[bc.status] || ''}`}>
                      {bc.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 ml-7">{bc.message}</p>
                  <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {bc.target_audience === 'all' ? 'All' : bc.target_audience} • {bc.total_recipients} recipients
                    </span>
                    {bc.sent_count > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {bc.sent_count} sent
                      </span>
                    )}
                    {bc.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        {bc.failed_count} failed
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(bc.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {bc.status === 'draft' && (
                  <button
                    onClick={() => handleSend(bc.id)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors shrink-0"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
