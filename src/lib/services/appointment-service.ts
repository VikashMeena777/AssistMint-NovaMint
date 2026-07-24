// ============================================
// AssistMint — Appointment Service
// CRUD for appointments + slot management
// Used by Salon, Healthcare, Education categories
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface Appointment {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  staff_id: string | null;
  service_name: string;
  service_price: number;
  appointment_date: string;   // YYYY-MM-DD
  start_time: string;         // HH:MM
  end_time: string;           // HH:MM
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  staff_name?: string;
}

export interface StaffMember {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string | null;
  role: string;
  specialization: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TimeSlot {
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  available: boolean;
  staff_id?: string;
  staff_name?: string;
}

// ─── Appointments CRUD ──────────────────────

export async function createAppointment(data: {
  restaurant_id: string;
  customer_id?: string;
  staff_id?: string;
  service_name: string;
  service_price: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}): Promise<{ appointment: Appointment | null; error: string | null }> {
  // Check for conflicts
  const conflict = await checkConflict(
    data.restaurant_id,
    data.appointment_date,
    data.start_time,
    data.end_time,
    data.staff_id
  );
  if (conflict) {
    return { appointment: null, error: 'This time slot is already booked.' };
  }

  const { data: result, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      restaurant_id: data.restaurant_id,
      customer_id: data.customer_id || null,
      staff_id: data.staff_id || null,
      service_name: data.service_name,
      service_price: data.service_price,
      appointment_date: data.appointment_date,
      start_time: data.start_time,
      end_time: data.end_time,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
      notes: data.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { appointment: null, error: error.message };
  return { appointment: result as unknown as Appointment, error: null };
}

export async function getAppointments(
  restaurantId: string,
  filters?: {
    date?: string;
    status?: string;
    staff_id?: string;
    from_date?: string;
    to_date?: string;
  }
): Promise<Appointment[]> {
  let query = supabaseAdmin
    .from('appointments')
    .select('*, staff:staff_id(name)')
    .eq('restaurant_id', restaurantId)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (filters?.date) {
    query = query.eq('appointment_date', filters.date);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.staff_id) {
    query = query.eq('staff_id', filters.staff_id);
  }
  if (filters?.from_date) {
    query = query.gte('appointment_date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('appointment_date', filters.to_date);
  }

  const { data } = await query.limit(100);

  return (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    const staffData = r.staff as Record<string, unknown> | null;
    return {
      ...(r as unknown as Appointment),
      staff_name: staffData?.name as string || null,
    } as Appointment;
  });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: Appointment['status']
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  return { error: error?.message || null };
}

export async function markReminderSent(appointmentId: string): Promise<void> {
  await supabaseAdmin
    .from('appointments')
    .update({ reminder_sent: true })
    .eq('id', appointmentId);
}

// ─── Slot Management ────────────────────────

/**
 * Generate available time slots for a given date.
 * Uses business hours + existing appointments to find gaps.
 */
export async function getAvailableSlots(
  restaurantId: string,
  date: string,              // YYYY-MM-DD
  slotDurationMinutes: number = 30,
  staffId?: string
): Promise<TimeSlot[]> {
  // 1. Get business hours for this day
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('business_hours')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return [];
  const hours = (restaurant as Record<string, unknown>).business_hours as Record<string, { open: string; close: string }>;
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()];
  const dayHours = hours?.[dayOfWeek];

  if (!dayHours?.open || !dayHours?.close) return [];

  // 2. Get existing appointments for this date
  let apptQuery = supabaseAdmin
    .from('appointments')
    .select('start_time, end_time, staff_id')
    .eq('restaurant_id', restaurantId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed']);

  if (staffId) {
    apptQuery = apptQuery.eq('staff_id', staffId);
  }

  const { data: existingAppts } = await apptQuery;
  const bookedSlots = (existingAppts || []).map((a) => {
    const r = a as Record<string, unknown>;
    return {
      start: r.start_time as string,
      end: r.end_time as string,
      staff_id: r.staff_id as string,
    };
  });

  // 3. Generate all possible slots
  const slots: TimeSlot[] = [];
  const [openH, openM] = dayHours.open.split(':').map(Number);
  const [closeH, closeM] = dayHours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let mins = openMinutes; mins + slotDurationMinutes <= closeMinutes; mins += slotDurationMinutes) {
    const startH = Math.floor(mins / 60);
    const startM = mins % 60;
    const endH = Math.floor((mins + slotDurationMinutes) / 60);
    const endM = (mins + slotDurationMinutes) % 60;

    const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Check if slot overlaps with any booked appointment
    const isBooked = bookedSlots.some((b) => {
      return startTime < b.end && endTime > b.start;
    });

    // Don't show past slots for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isPast = date === today && mins < currentMinutes + 30; // 30min buffer

    slots.push({
      start_time: startTime,
      end_time: endTime,
      available: !isBooked && !isPast,
    });
  }

  return slots;
}

// ─── Conflict Check ─────────────────────────

async function checkConflict(
  restaurantId: string,
  date: string,
  startTime: string,
  endTime: string,
  staffId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  const { data } = await query.limit(1);
  return (data || []).length > 0;
}

// ─── Staff CRUD ─────────────────────────────

export async function getStaffMembers(restaurantId: string): Promise<StaffMember[]> {
  const { data } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (data || []) as unknown as StaffMember[];
}

export async function createStaffMember(data: {
  restaurant_id: string;
  name: string;
  phone?: string;
  role?: string;
  specialization?: string;
}): Promise<{ staff: StaffMember | null; error: string | null }> {
  const { data: result, error } = await supabaseAdmin
    .from('staff')
    .insert({
      restaurant_id: data.restaurant_id,
      name: data.name,
      phone: data.phone || null,
      role: data.role || 'staff',
      specialization: data.specialization || null,
    })
    .select()
    .single();

  if (error) return { staff: null, error: error.message };
  return { staff: result as unknown as StaffMember, error: null };
}

export async function updateStaffMember(
  staffId: string,
  updates: Partial<Pick<StaffMember, 'name' | 'phone' | 'role' | 'specialization' | 'is_active'>>
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from('staff')
    .update(updates)
    .eq('id', staffId);

  return { error: error?.message || null };
}

export async function deleteStaffMember(staffId: string): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from('staff')
    .update({ is_active: false })
    .eq('id', staffId);

  return { error: error?.message || null };
}

// ─── Upcoming Reminders ─────────────────────

/**
 * Get appointments that need a reminder (within the next hour, not yet sent).
 */
export async function getUpcomingReminders(): Promise<Appointment[]> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const laterTime = `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`;

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('*, staff:staff_id(name)')
    .eq('appointment_date', today)
    .eq('reminder_sent', false)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', currentTime)
    .lte('start_time', laterTime);

  return (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    const staffData = r.staff as Record<string, unknown> | null;
    return {
      ...(r as unknown as Appointment),
      staff_name: staffData?.name as string || null,
    } as Appointment;
  });
}
