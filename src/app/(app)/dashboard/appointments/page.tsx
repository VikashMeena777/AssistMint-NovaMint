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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  completed: '🎉 Completed',
  cancelled: '❌ Cancelled',
  no_show: '👻 No Show',
};

// ─── Main Component ─────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewForm, setShowNewForm] = useState(false);

  const loadData = useCallback(async () => {
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
  }, [selectedDate, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    const result = await changeAppointmentStatus(id, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Appointment ${status}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage bookings and schedule</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Booking
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card border-border/50 hover:bg-muted'
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
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-2xl">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-muted-foreground">No appointments for {formatDate(selectedDate)}</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            + Book an appointment
          </button>
        </div>
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
    <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-base font-semibold">{a.service_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[a.status]}`}>
              {STATUS_LABELS[a.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
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
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {a.customer_phone}
              </span>
            )}
            {a.staff_name && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                🧑‍💼 {a.staff_name}
              </span>
            )}
          </div>

          {a.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">📝 {a.notes}</p>
          )}

          <div className="text-sm font-medium text-emerald-400 mt-2">
            ₹{(a.service_price / 100).toFixed(0)}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {a.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusChange(a.id, 'confirmed')}
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Confirm"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStatusChange(a.id, 'cancelled')}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
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
                className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                title="Mark Completed"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStatusChange(a.id, 'no_show')}
                className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
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
