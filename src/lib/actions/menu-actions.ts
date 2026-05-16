// ============================================
// AssistMint — Menu Server Actions
// Categories + Items CRUD
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

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
    .order('sort_order', { ascending: true });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createCategory(
  restaurantId: string,
  category: { name: string; description?: string; sort_order?: number }
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      restaurant_id: restaurantId,
      name: category.name,
      description: category.description || null,
      sort_order: category.sort_order ?? 0,
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
  updates: { name?: string; description?: string; sort_order?: number; is_active?: boolean }
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

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
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
    .order('sort_order', { ascending: true });

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
    base_price: number;      // in paise
    image_url?: string;
    is_veg: boolean;
    is_bestseller?: boolean;
    is_spicy?: boolean;
    prep_time_min?: number;
    sort_order?: number;
    tags?: string[];
    variants?: Array<{ name: string; price: number }>;
    addons?: Array<{ name: string; price: number }>;
  }
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      category_id: item.category_id,
      name: item.name,
      description: item.description || null,
      base_price: item.base_price,
      image_url: item.image_url || null,
      is_veg: item.is_veg,
      is_bestseller: item.is_bestseller ?? false,
      is_spicy: item.is_spicy ?? false,
      is_available: true,
      prep_time_min: item.prep_time_min ?? 15,
      sort_order: item.sort_order ?? 0,
      tags: item.tags || [],
      variants: item.variants || [],
      addons: item.addons || [],
    })
    .select()
    .single();

  if (error) return { error: error.message };
  logActivity({ restaurantId, actorType: 'owner', action: ACTIONS.MENU_ITEM_CREATED, details: { name: item.name, price: item.base_price } });
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
  items: Array<{ id: string; sort_order: number }>
) {
  const { supabase, error: authError } = await verifyOwnership(restaurantId);
  if (authError) return { error: authError };

  // Update each item's sort order
  const updates = items.map((item) =>
    supabase
      .from('menu_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('restaurant_id', restaurantId)
  );

  await Promise.all(updates);
  revalidatePath('/dashboard/menu');
  return { success: true };
}
