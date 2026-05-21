// ============================================
// AssistMint — Combo Server Actions
// Combo meal CRUD for dashboard
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';
import { checkPlanLimit } from '@/lib/utils/enforce-limits';

// ─── Get Combos ─────────────────────────────

export async function getCombos(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('combos')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Create Combo ───────────────────────────

export async function createCombo(
  restaurantId: string,
  combo: {
    name: string;
    description?: string;
    image_url?: string;
    combo_items: Array<{ item_id: string; name: string; quantity: number }>;
    original_price: number; // in paise
    combo_price: number;    // in paise
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // ── Plan limit check ──
  const limitCheck = await checkPlanLimit(restaurantId, 'combos');
  if (!limitCheck.allowed) return { error: limitCheck.message };

  if (combo.combo_price >= combo.original_price) {
    return { error: 'Combo price must be less than original price.' };
  }

  if (combo.combo_items.length < 2) {
    return { error: 'A combo must have at least 2 items.' };
  }

  const { data, error } = await supabase
    .from('combos')
    .insert({
      restaurant_id: restaurantId,
      name: combo.name,
      description: combo.description || null,
      image_url: combo.image_url || null,
      combo_items: combo.combo_items,
      original_price: combo.original_price,
      combo_price: combo.combo_price,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.COMBO_CREATED || 'combo.created',
    details: {
      comboName: combo.name,
      itemCount: combo.combo_items.length,
      savings: combo.original_price - combo.combo_price,
    },
  });

  revalidatePath('/dashboard/combos');
  return { data };
}

// ─── Update Combo ───────────────────────────

export async function updateCombo(
  restaurantId: string,
  comboId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('combos')
    .update(updates)
    .eq('id', comboId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/combos');
  return { success: true };
}

// ─── Delete Combo ───────────────────────────

export async function deleteCombo(restaurantId: string, comboId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('combos')
    .delete()
    .eq('id', comboId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/combos');
  return { success: true };
}

// ─── Toggle Combo Active ────────────────────

export async function toggleComboActive(
  restaurantId: string,
  comboId: string,
  isActive: boolean
) {
  return updateCombo(restaurantId, comboId, { is_active: isActive });
}
