// ============================================
// AssistMint — Inquiry Server Actions
// Dashboard CRUD for inquiries / leads
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  getInquiries,
  updateInquiryStatus,
  type Inquiry,
} from '@/lib/services/inquiry-service';
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

// ─── Fetch Inquiries ────────────────────────

export async function fetchInquiries(filters?: {
  status?: string;
  from_date?: string;
  to_date?: string;
}): Promise<Inquiry[]> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return [];
  return getInquiries(restaurantId, filters);
}

// ─── Update Inquiry Status ──────────────────

export async function changeInquiryStatus(
  inquiryId: string,
  status: Inquiry['status'],
  notes?: string
): Promise<{ error: string | null }> {
  const restaurantId = await getRestaurantId();
  if (!restaurantId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await updateInquiryStatus(inquiryId, status, notes);

  if (!result.error) {
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: user?.id || 'system',
      action: `inquiry.${status}`,
      details: { inquiryId },
    });
  }

  revalidatePath('/dashboard/inquiries');
  return result;
}
