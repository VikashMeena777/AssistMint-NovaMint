// ============================================
// AssistMint — Broadcast Server Actions
// Dashboard CRUD for broadcast messages
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createBroadcast,
  getBroadcasts,
  sendBroadcast,
  getTargetCustomers,
  type Broadcast,
} from '@/lib/services/broadcast-service';
import { logActivity } from '@/lib/utils/activity-logger';

// ─── Helper: Get current user's restaurant ──

async function getRestaurantId(): Promise<{ id: string | null; userId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, userId: null };

  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  return {
    id: (data as Record<string, unknown> | null)?.id as string || null,
    userId: user.id,
  };
}

// ─── Fetch Broadcasts ───────────────────────

export async function fetchBroadcasts(): Promise<Broadcast[]> {
  const { id } = await getRestaurantId();
  if (!id) return [];
  return getBroadcasts(id);
}

// ─── Create Broadcast ───────────────────────

export async function createNewBroadcast(data: {
  title: string;
  message: string;
  target_audience?: Broadcast['target_audience'];
}): Promise<{ error: string | null }> {
  const { id, userId } = await getRestaurantId();
  if (!id) return { error: 'Unauthorized' };

  const result = await createBroadcast({
    restaurant_id: id,
    title: data.title,
    message: data.message,
    target_audience: data.target_audience || 'all',
    created_by: userId || undefined,
  });

  if (!result.error) {
    logActivity({
      restaurantId: id,
      actorType: 'owner',
      actorId: userId || 'system',
      action: 'broadcast.created',
      details: { title: data.title, audience: data.target_audience },
    });
  }

  revalidatePath('/dashboard/campaigns');
  return { error: result.error };
}

// ─── Send Broadcast ─────────────────────────

export async function triggerBroadcast(broadcastId: string): Promise<{
  sent: number;
  failed: number;
  error: string | null;
}> {
  const { id, userId } = await getRestaurantId();
  if (!id) return { sent: 0, failed: 0, error: 'Unauthorized' };

  const result = await sendBroadcast(broadcastId, id);

  if (!result.error) {
    logActivity({
      restaurantId: id,
      actorType: 'owner',
      actorId: userId || 'system',
      action: 'broadcast.sent',
      details: { broadcastId, sent: result.sent, failed: result.failed },
    });
  }

  revalidatePath('/dashboard/campaigns');
  return result;
}

// ─── Get Audience Count ─────────────────────

export async function getAudienceCount(
  audience: Broadcast['target_audience']
): Promise<number> {
  const { id } = await getRestaurantId();
  if (!id) return 0;
  const customers = await getTargetCustomers(id, audience);
  return customers.length;
}
