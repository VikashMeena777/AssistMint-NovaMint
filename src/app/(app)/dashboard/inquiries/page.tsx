'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchInquiries, changeInquiryStatus } from '@/lib/actions/inquiry-actions';
import type { Inquiry } from '@/lib/services/inquiry-service';
import { toast } from 'sonner';
import {
  MessageSquareText,
  Phone,
  User,
  Clock,
  Filter,
  CheckCircle2,
  Mail,
  UserCheck,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: '🆕 New', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Mail className="w-3.5 h-3.5" /> },
  contacted: { label: '📞 Contacted', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Phone className="w-3.5 h-3.5" /> },
  interested: { label: '⭐ Interested', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  enrolled: { label: '✅ Enrolled', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: <UserCheck className="w-3.5 h-3.5" /> },
  closed: { label: '❌ Closed', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchInquiries(
      statusFilter !== 'all' ? { status: statusFilter } : undefined
    );
    setInquiries(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (id: string, status: Inquiry['status']) => {
    const result = await changeInquiryStatus(id, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Inquiry marked as ${status}`);
      loadData();
    }
  };

  const counts = {
    total: inquiries.length,
    new_count: inquiries.filter((i) => i.status === 'new').length,
    contacted: inquiries.filter((i) => i.status === 'contacted').length,
    interested: inquiries.filter((i) => i.status === 'interested').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Inquiries</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and follow up on customer inquiries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="bg-card border border-blue-500/20 rounded-2xl p-4">
          <p className="text-xs text-blue-400">New</p>
          <p className="text-2xl font-bold text-blue-400">{counts.new_count}</p>
        </div>
        <div className="bg-card border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs text-amber-400">Contacted</p>
          <p className="text-2xl font-bold text-amber-400">{counts.contacted}</p>
        </div>
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-400">Interested</p>
          <p className="text-2xl font-bold text-emerald-400">{counts.interested}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {['all', 'new', 'contacted', 'interested', 'enrolled', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card border-border/50 hover:bg-muted'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Inquiry List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-2xl">
          <div className="text-4xl mb-3">📩</div>
          <p className="text-lg font-medium mb-1">No inquiries yet</p>
          <p className="text-muted-foreground text-sm">
            When customers ask questions on WhatsApp, their inquiries will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <InquiryCard
              key={inq.id}
              inquiry={inq}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inquiry Card ───────────────────────────

function InquiryCard({
  inquiry: inq,
  onStatusChange,
}: {
  inquiry: Inquiry;
  onStatusChange: (id: string, status: Inquiry['status']) => void;
}) {
  const config = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
  const timeAgo = getTimeAgo(inq.created_at);

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>

          {/* Interest */}
          <p className="font-medium flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-primary" />
            Interested in: <span className="text-primary">{inq.interest}</span>
          </p>

          {/* Customer Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
            {inq.customer_name && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {inq.customer_name}
              </span>
            )}
            {inq.customer_phone && (
              <a
                href={`tel:${inq.customer_phone}`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {inq.customer_phone}
              </a>
            )}
          </div>

          {/* Message */}
          {inq.message && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">📝 {inq.message}</p>
          )}

          {/* Follow-up notes */}
          {inq.follow_up_notes && (
            <p className="text-xs text-emerald-400/70 mt-1">✅ {inq.follow_up_notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {inq.status === 'new' && (
            <button
              onClick={() => onStatusChange(inq.id, 'contacted')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              📞 Contacted
            </button>
          )}
          {(inq.status === 'new' || inq.status === 'contacted') && (
            <button
              onClick={() => onStatusChange(inq.id, 'interested')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              ⭐ Interested
            </button>
          )}
          {inq.status === 'interested' && (
            <button
              onClick={() => onStatusChange(inq.id, 'enrolled')}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              ✅ Enrolled
            </button>
          )}
          {inq.status !== 'closed' && inq.status !== 'enrolled' && (
            <button
              onClick={() => onStatusChange(inq.id, 'closed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Time Ago Helper ────────────────────────

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
