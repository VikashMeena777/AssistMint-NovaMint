'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchStaff, addStaff, editStaff, removeStaff } from '@/lib/actions/appointment-actions';
import type { StaffMember } from '@/lib/services/appointment-service';
import { toast } from 'sonner';
import { Plus, X, Pencil, Trash2, User, Phone, Briefcase, Star } from 'lucide-react';

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    const data = await fetchStaff();
    setStaff(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from staff?`)) return;
    const result = await removeStaff(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${name} removed`);
      loadStaff();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your team members
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-2xl">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-lg font-medium mb-1">No staff members yet</p>
          <p className="text-muted-foreground text-sm mb-4">
            Add your team to assign them to appointments
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            + Add your first staff member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onEdit={() => { setEditingId(member.id); setShowForm(true); }}
              onDelete={() => handleDelete(member.id, member.name)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <StaffFormModal
          existingStaff={editingId ? staff.find((s) => s.id === editingId) : undefined}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingId(null);
            loadStaff();
          }}
        />
      )}
    </div>
  );
}

// ─── Staff Card ─────────────────────────────

function StaffCard({
  member,
  onEdit,
  onDelete,
}: {
  member: StaffMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-border transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{member.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        {member.specialization && (
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5" />
            <span>{member.specialization}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staff Form Modal ───────────────────────

function StaffFormModal({
  existingStaff,
  onClose,
  onSaved,
}: {
  existingStaff?: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!existingStaff;
  const [form, setForm] = useState({
    name: existingStaff?.name || '',
    phone: existingStaff?.phone || '',
    role: existingStaff?.role || 'staff',
    specialization: existingStaff?.specialization || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);

    if (isEditing && existingStaff) {
      const result = await editStaff(existingStaff.id, {
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
        specialization: form.specialization || undefined,
      });
      setSaving(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Staff updated');
        onSaved();
      }
    } else {
      const result = await addStaff({
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
        specialization: form.specialization || undefined,
      });
      setSaving(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Staff added!');
        onSaved();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Staff' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              placeholder="e.g. Priya Sharma"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              placeholder="+91..."
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
            >
              <option value="staff">Staff</option>
              <option value="stylist">Stylist</option>
              <option value="therapist">Therapist</option>
              <option value="doctor">Doctor</option>
              <option value="instructor">Instructor</option>
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Specialization</label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
              placeholder="e.g. Hair Coloring, Bridal Makeup..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Staff' : 'Add Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
