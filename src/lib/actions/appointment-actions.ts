// ============================================
// AssistMint — Appointment Server Actions
// Dashboard CRUD for appointments + staff
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  type Appointment,
  type StaffMember,
} from '@/lib/services/appointment-service';
import { logActivity } from '@/lib/utils/activity-logger';

// ─── Helper: Get current user's restaurant ──

async function getRestaurantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  return (data as Record<string, unknown> | null)?.id as string || null;
}

// ─── Appointments ───────────────────────────

export async function fetchAppointments(filters?: {
  date?: string;
  status?: string;
  staff_id?: string;
  from_date?: string;
  to_date?: string;
}): Promise<Appointment[]> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return [];
  return getAppointments(restaurantId, filters);
}

export async function bookAppointment(data: {
  service_name: string;
  service_price: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  staff_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await createAppointment({
    restaurant_id: restaurantId,
    ...data,
  });

  if (result.error) return { error: result.error };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user?.id || 'system',
    action: 'appointment.created',
    details: {
      service: data.service_name,
      date: data.appointment_date,
      time: data.start_time,
    },
  });

  revalidatePath('/dashboard/appointments');
  return { error: null };
}

export async function changeAppointmentStatus(
  appointmentId: string,
  status: Appointment['status']
): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await updateAppointmentStatus(appointmentId, status);

  if (!result.error) {
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: user?.id || 'system',
      action: `appointment.${status}`,
      details: { appointmentId },
    });
  }

  revalidatePath('/dashboard/appointments');
  return result;
}

// ─── Staff ──────────────────────────────────

export async function fetchStaff(): Promise<StaffMember[]> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return [];
  return getStaffMembers(restaurantId);
}

export async function addStaff(data: {
  name: string;
  phone?: string;
  role?: string;
  specialization?: string;
}): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await createStaffMember({
    restaurant_id: restaurantId,
    ...data,
  });

  if (result.error) return { error: result.error };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user?.id || 'system',
    action: 'staff.created',
    details: { name: data.name, role: data.role },
  });

  revalidatePath('/dashboard/staff');
  return { error: null };
}

export async function editStaff(
  staffId: string,
  updates: Partial<Pick<StaffMember, 'name' | 'phone' | 'role' | 'specialization' | 'is_active'>>
): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const result = await updateStaffMember(staffId, updates);
  revalidatePath('/dashboard/staff');
  return result;
}

export async function removeStaff(staffId: string): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await deleteStaffMember(staffId);

  if (!result.error) {
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: user?.id || 'system',
      action: 'staff.deleted',
      details: { staffId },
    });
  }

  revalidatePath('/dashboard/staff');
  return result;
}
