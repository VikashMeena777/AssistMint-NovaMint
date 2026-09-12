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
  Inbox,
} from 'lucide-react';
import { StatusPill, type StatusTone } from '@/components/dashboard/status-pill';
import { EmptyState } from '@/components/dashboard/empty-state';

const STATUS_CONFIG: Record<string, { label: string; tone: StatusTone }> = {
  new: { label: 'New', tone: 'primary' },
  contacted: { label: 'Contacted', tone: 'warning' },
  interested: { label: 'Interested', tone: 'success' },
  enrolled: { label: 'Enrolled', tone: 'success' },
  closed: { label: 'Closed', tone: 'muted' },
};

import { getCurrentRestaurant } from '@/lib/actions/restaurant-actions';
import { getBusinessTypeConfig } from '@/lib/utils/business-types';

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [businessType, setBusinessType] = useState<string>('education');

  useEffect(() => {
    (async () => {
      try {
        const r = await getCurrentRestaurant();
        if (r?.business_type) setBusinessType(r.business_type as string);
      } catch (err) {
        console.error('Failed to load business type:', err);
      }
    })();
  }, []);

  const config = getBusinessTypeConfig(businessType);
  const terms = config.terms;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchInquiries(
        statusFilter !== 'all' ? { status: statusFilter } : undefined
      );
      setInquiries(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      setError('Could not load. Please retry.');
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void (async () => {
      loadData();
    })();
  }, [loadData]);

  const handleRetry = () => {
    setError(null);
    loadData();
  };

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
        <h1 className="text-xl font-semibold tracking-tight">{terms.customer} Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Track and follow up on {terms.customer.toLowerCase()} inquiries and lead requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold font-mono tabular-nums">{counts.total}</p>
        </div>
        <div className="bg-card border border-primary/25 rounded-2xl p-4">
          <p className="text-xs text-primary">New</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-primary">{counts.new_count}</p>
        </div>
        <div className="bg-card border border-warning/25 rounded-2xl p-4">
          <p className="text-xs text-warning">Contacted</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-warning">{counts.contacted}</p>
        </div>
        <div className="bg-card border border-success/25 rounded-2xl p-4">
          <p className="text-xs text-success">Interested</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-success">{counts.interested}</p>
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
                : 'bg-card border-border/50 hover:bg-secondary'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Inquiry List */}
      {error && !inquiries.length ? (
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
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No inquiries yet"
          description="When customers ask questions on WhatsApp, their inquiries will appear here."
        />
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
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:bg-secondary/60 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <StatusPill tone={config.tone}>
              {config.label}
            </StatusPill>
            <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
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
            <p className="text-xs text-muted-foreground mt-1.5 italic">{inq.message}</p>
          )}

          {/* Follow-up notes */}
          {inq.follow_up_notes && (
            <p className="text-xs text-success mt-1">{inq.follow_up_notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {inq.status === 'new' && (
            <button
              onClick={() => onStatusChange(inq.id, 'contacted')}
              className="text-xs px-3 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
            >
              Contacted
            </button>
          )}
          {(inq.status === 'new' || inq.status === 'contacted') && (
            <button
              onClick={() => onStatusChange(inq.id, 'interested')}
              className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
            >
              Interested
            </button>
          )}
          {inq.status === 'interested' && (
            <button
              onClick={() => onStatusChange(inq.id, 'enrolled')}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Enrolled
            </button>
          )}
          {inq.status !== 'closed' && inq.status !== 'enrolled' && (
            <button
              onClick={() => onStatusChange(inq.id, 'closed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-secondary transition-colors"
            >
              Close
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
