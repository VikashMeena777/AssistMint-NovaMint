// ============================================
// AssistMint — Reward Server Actions
// CRUD for loyalty rewards catalog
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkPlanLimit } from '@/lib/utils/enforce-limits';

// ─── Get Rewards ────────────────────────────

export async function getRewards(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rewards')
    .select('*, menu_items(name)')
    .eq('restaurant_id', restaurantId)
    .order('points_required', { ascending: true });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Create Reward ──────────────────────────

export async function createReward(
  restaurantId: string,
  reward: {
    name: string;
    description?: string;
    points_required: number;
    reward_type: 'free_item' | 'discount' | 'free_delivery';
    reward_value?: number;
    reward_item_id?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // ── Plan limit check ──
  const limitCheck = await checkPlanLimit(restaurantId, 'rewards');
  if (!limitCheck.allowed) return { error: limitCheck.message };

  const { data, error } = await supabase
    .from('rewards')
    .insert({
      restaurant_id: restaurantId,
      name: reward.name,
      description: reward.description || null,
      points_required: reward.points_required,
      reward_type: reward.reward_type,
      reward_value: reward.reward_value || null,
      reward_item_id: reward.reward_item_id || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard/loyalty');
  return { data };
}

// ─── Update Reward ──────────────────────────

export async function updateReward(
  restaurantId: string,
  rewardId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/loyalty');
  return { success: true };
}

// ─── Delete Reward ──────────────────────────

export async function deleteReward(restaurantId: string, rewardId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/loyalty');
  return { success: true };
}

// ─── Toggle Reward Active ───────────────────

export async function toggleRewardActive(
  restaurantId: string,
  rewardId: string,
  isActive: boolean
) {
  return updateReward(restaurantId, rewardId, { is_active: isActive });
}
