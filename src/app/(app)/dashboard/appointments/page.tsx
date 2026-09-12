'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAppointments,
  bookAppointment,
  changeAppointmentStatus,
  fetchStaff,
} from '@/lib/actions/appointment-actions';
import type { Appointment, StaffMember } from '@/lib/services/appointment-service';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Plus,
  X,
  Check,
  XCircle,
  User,
  Phone,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StatusPill, type StatusTone } from '@/components/dashboard/status-pill';
import { EmptyState } from '@/components/dashboard/empty-state';

// ─── Date helpers ───────────────────────────

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const STATUS_TONES: Record<string, StatusTone> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'primary',
  cancelled: 'destructive',
  no_show: 'muted',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

import { getCurrentRestaurant } from '@/lib/actions/restaurant-actions';
import { getBusinessTypeConfig } from '@/lib/utils/business-types';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [businessType, setBusinessType] = useState<string>('salon_spa');

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
      const [appts, staffList] = await Promise.all([
        fetchAppointments({
          date: selectedDate,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        }),
        fetchStaff(),
      ]);
      setAppointments(appts);
      setStaff(staffList);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not load. Please retry.');
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    void (async () => {
      loadData();
    })();
  }, [loadData]);

  const handleRetry = () => {
    setError(null);
    loadData();
  };

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    const result = await changeAppointmentStatus(id, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Booking status updated`);
      loadData();
    }
  };

  // Count by status
  const counts = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{terms.bookings}</h1>
          <p className="text-sm text-muted-foreground">Manage bookings and scheduling</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="stamp inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New {terms.booking}
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-3 bg-card border border-border/50 rounded-2xl p-4">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-4">
          <button
            onClick={() => setSelectedDate(getToday())}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedDate === getToday()
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Today
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none"
            />
          </div>

          <span className="text-muted-foreground text-sm">
            {formatDate(selectedDate)}
          </span>
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
        </div>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border tabular-nums transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card border-border/50 hover:bg-secondary'
            }`}
          >
            {s === 'all' ? `All (${counts.total})` :
             s === 'pending' ? `Pending (${counts.pending})` :
             s === 'confirmed' ? `Confirmed (${counts.confirmed})` :
             s === 'completed' ? `Done (${counts.completed})` :
             'Cancelled'}
          </button>
        ))}
      </div>

      {/* Appointment List */}
      {error && !appointments.length ? (
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
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No ${terms.bookings.toLowerCase()} for ${formatDate(selectedDate)}`}
          description="Bookings appear here once clients book through your WhatsApp bot."
          action={
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Book an appointment →
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* New Booking Modal */}
      {showNewForm && (
        <NewBookingModal
          staff={staff}
          onClose={() => setShowNewForm(false)}
          onSaved={() => {
            setShowNewForm(false);
            loadData();
          }}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

// ─── Appointment Card ───────────────────────

function AppointmentCard({
  appointment: a,
  onStatusChange,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: Appointment['status']) => void;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:bg-secondary/60 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-base font-semibold">{a.service_name}</span>
            <StatusPill tone={STATUS_TONES[a.status] || 'muted'}>
              {STATUS_LABELS[a.status] || a.status}
            </StatusPill>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(a.start_time)} — {formatTime(a.end_time)}
            </span>
            {a.customer_name && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {a.customer_name}
              </span>
            )}
            {a.customer_phone && (
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <Phone className="w-3.5 h-3.5" />
                {a.customer_phone}
              </span>
            )}
            {a.staff_name && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {a.staff_name}
              </span>
            )}
          </div>

          {a.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">{a.notes}</p>
          )}

          <div className="text-sm font-medium font-mono tabular-nums text-success mt-2">
            ₹{(a.service_price / 100).toFixed(0)}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {a.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusChange(a.id, 'confirmed')}
                className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                title="Confirm"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStatusChange(a.id, 'cancelled')}
                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Cancel"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {a.status === 'confirmed' && (
            <>
              <button
                onClick={() => onStatusChange(a.id, 'completed')}
                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Mark Completed"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStatusChange(a.id, 'no_show')}
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-secondary transition-colors"
                title="No Show"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Booking Modal ──────────────────────

function NewBookingModal({
  staff,
  onClose,
  onSaved,
  selectedDate,
}: {
  staff: StaffMember[];
  onClose: () => void;
  onSaved: () => void;
  selectedDate: string;
}) {
  const [form, setForm] = useState({
    service_name: '',
    service_price: '',
    appointment_date: selectedDate,
    start_time: '10:00',
    end_time: '10:30',
    staff_id: '',
    customer_name: '',
    customer_phone: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!form.service_name) {
      toast.error('Service name is required');
      return;
    }

    setSaving(true);
    const result = await bookAppointment({
      service_name: form.service_name,
      service_price: Math.round(parseFloat(form.service_price || '0') * 100),
      appointment_date: form.appointment_date,
      start_time: form.start_time,
      end_time: form.end_time,
      staff_id: form.staff_id || undefined,
      customer_name: form.customer_name || undefined,
      customer_phone: form.customer_phone || undefined,
      notes: form.notes || undefined,
    });

    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Appointment booked!');
      onSaved();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">New Appointment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Service *</label>
            <input
              type="text"
              value={form.service_name}
              onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              placeholder="e.g. Haircut, Facial, Consultation..."
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Price (₹)</label>
            <input
              type="number"
              value={form.service_price}
              onChange={(e) => setForm({ ...form, service_price: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              placeholder="300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Date</label>
              <input
                type="date"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Staff</label>
              <select
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              >
                <option value="">Any available</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.specialization ? `(${s.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Customer Name</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Customer Phone</label>
              <input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none resize-none"
              rows={2}
              placeholder="Any special requests..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !form.service_name}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
