// ============================================
// AssistMint — Menu Server Actions
// Categories + Items CRUD
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';
import { checkPlanLimit } from '@/lib/utils/enforce-limits';

// ─── Helper: Verify Restaurant Ownership ────

async function verifyOwnership(restaurantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'Unauthorized' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { supabase, user: null, error: 'Not authorized' };
  }

  return { supabase, user, error: null };
}

// ═══════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════

export async function getCategories(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createCategory(
  restaurantId: string,
  category: { name: string; description?: string; display_order?: number }
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      restaurant_id: restaurantId,
      name: category.name,
      description: category.description || null,
      display_order: category.display_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  logActivity({ restaurantId, actorType: 'owner', action: ACTIONS.MENU_CATEGORY_CREATED, details: { name: category.name } });
  revalidatePath('/dashboard/menu');
  return { data };
}

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  updates: { name?: string; description?: string; display_order?: number; is_active?: boolean }
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from('menu_categories')
    .update(updates)
    .eq('id', categoryId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/menu');
  return { success: true };
}

export async function deleteCategory(restaurantId: string, categoryId: string) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { data, error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)
    .eq('restaurant_id', restaurantId)
    .select();

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Category not found or already deleted.' };

  logActivity({ restaurantId, actorType: 'owner', action: ACTIONS.MENU_CATEGORY_DELETED, details: { categoryId, name: (data[0] as Record<string, unknown>)?.name } });
  revalidatePath('/dashboard/menu');
  return { success: true };
}

// ═══════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════

export async function getMenuItems(restaurantId: string, categoryId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createMenuItem(
  restaurantId: string,
  item: {
    category_id: string;
    name: string;
    description?: string;
    price: number;             // in paise
    image_url?: string;
    is_veg: boolean;
    is_bestseller?: boolean;
    prep_time_minutes?: number;
    display_order?: number;
    tags?: string[];
  }
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  // ── Plan limit check ──
  const limitCheck = await checkPlanLimit(restaurantId, 'items');
  if (!limitCheck.allowed) return { error: limitCheck.message };

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      category_id: item.category_id,
      name: item.name,
      description: item.description || null,
      price: item.price,
      image_url: item.image_url || null,
      is_veg: item.is_veg,
      is_bestseller: item.is_bestseller ?? false,
      is_available: true,
      prep_time_minutes: item.prep_time_minutes ?? 15,
      display_order: item.display_order ?? 0,
      tags: item.tags ?? [],
    })
    .select()
    .single();

  if (error) return { error: error.message };
  logActivity({ restaurantId, actorType: 'owner', action: ACTIONS.MENU_ITEM_CREATED, details: { name: item.name, price: item.price } });
  revalidatePath('/dashboard/menu');
  return { data };
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  updates: Record<string, unknown>
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', itemId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/menu');
  return { success: true };
}

export async function deleteMenuItem(restaurantId: string, itemId: string) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  logActivity({ restaurantId, actorType: 'owner', action: ACTIONS.MENU_ITEM_DELETED, details: { itemId } });
  revalidatePath('/dashboard/menu');
  return { success: true };
}

// ─── Toggle Item Availability ───────────────

export async function toggleItemAvailability(
  restaurantId: string,
  itemId: string,
  isAvailable: boolean
) {
  return updateMenuItem(restaurantId, itemId, { is_available: isAvailable });
}

// ─── Bulk Update Sort Order ─────────────────

export async function reorderMenuItems(
  restaurantId: string,
  items: Array<{ id: string; display_order: number }>
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const updates = items.map((item) =>
    supabase
      .from('menu_items')
      .update({ display_order: item.display_order })
      .eq('id', item.id)
      .eq('restaurant_id', restaurantId)
  );

  await Promise.all(updates);
  revalidatePath('/dashboard/menu');
  return { success: true };
}
