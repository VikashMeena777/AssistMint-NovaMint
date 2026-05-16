// ============================================
// AssistMint — Menu Service
// CRUD + AI Context Builder for menu data
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface MenuCategory {
  id: string;
  name: string;
  name_local?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  name_local?: string;
  description?: string;
  price: number; // in paise
  image_url?: string;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  prep_time_minutes: number;
  variants?: MenuVariant[];
  addons?: MenuAddon[];
}

export interface MenuVariant {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
  category?: string;
  is_available: boolean;
}

export interface FullMenu {
  restaurantName: string;
  categories: (MenuCategory & { items: MenuItem[] })[];
}

// ─── Fetch Full Menu ────────────────────────

export async function getFullMenu(restaurantId: string): Promise<FullMenu | null> {
  // Get restaurant name
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return null;

  // Get categories
  const { data: categories } = await supabaseAdmin
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_order');

  if (!categories || categories.length === 0) {
    return { restaurantName: (restaurant as Record<string, string>).name, categories: [] };
  }

  // Get items with variants
  const { data: items } = await supabaseAdmin
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)
    .order('display_order');

  // Get variants
  const itemIds = (items || []).map((i: Record<string, unknown>) => i.id as string);
  const { data: variants } = itemIds.length > 0
    ? await supabaseAdmin
        .from('menu_item_variants')
        .select('*')
        .in('item_id', itemIds)
        .eq('is_available', true)
    : { data: [] };

  // Get addons
  const { data: addons } = await supabaseAdmin
    .from('menu_item_addons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  // Build structured menu
  const variantsByItem = new Map<string, MenuVariant[]>();
  for (const v of (variants || []) as Record<string, unknown>[]) {
    const itemId = v.item_id as string;
    if (!variantsByItem.has(itemId)) variantsByItem.set(itemId, []);
    variantsByItem.get(itemId)!.push({
      id: v.id as string,
      name: v.name as string,
      price: v.price as number,
      is_available: v.is_available as boolean,
    });
  }

  const menuCategories = (categories as Record<string, unknown>[]).map((cat) => {
    const catItems = ((items || []) as Record<string, unknown>[])
      .filter((item) => item.category_id === cat.id)
      .map((item) => ({
        id: item.id as string,
        category_id: item.category_id as string,
        category_name: cat.name as string,
        name: item.name as string,
        name_local: item.name_local as string | undefined,
        description: item.description as string | undefined,
        price: item.price as number,
        image_url: item.image_url as string | undefined,
        is_veg: item.is_veg as boolean,
        is_bestseller: item.is_bestseller as boolean,
        is_available: item.is_available as boolean,
        prep_time_minutes: (item.prep_time_minutes as number) || 15,
        variants: variantsByItem.get(item.id as string) || [],
        addons: ((addons || []) as Record<string, unknown>[]).map((a) => ({
          id: a.id as string,
          name: a.name as string,
          price: a.price as number,
          category: a.category as string | undefined,
          is_available: a.is_available as boolean,
        })),
      }));

    return {
      id: cat.id as string,
      name: cat.name as string,
      name_local: cat.name_local as string | undefined,
      description: cat.description as string | undefined,
      display_order: cat.display_order as number,
      is_active: cat.is_active as boolean,
      items: catItems,
    };
  });

  return {
    restaurantName: (restaurant as Record<string, string>).name,
    categories: menuCategories,
  };
}

// ─── Build AI Menu Context ──────────────────

export function buildMenuContext(menu: FullMenu): string {
  if (menu.categories.length === 0) {
    return `Restaurant: ${menu.restaurantName}\nMenu is currently empty. Please inform the customer that the menu is being set up.`;
  }

  let context = `🍽️ RESTAURANT: ${menu.restaurantName}\n\n`;

  for (const category of menu.categories) {
    if (category.items.length === 0) continue;
    context += `📂 ${category.name.toUpperCase()}\n`;
    context += '─'.repeat(30) + '\n';

    for (const item of category.items) {
      const veg = item.is_veg ? '🟢' : '🔴';
      const best = item.is_bestseller ? ' ⭐ BESTSELLER' : '';
      const price = `₹${(item.price / 100).toFixed(0)}`;

      context += `${veg} ${item.name} — ${price}${best}\n`;
      if (item.description) context += `   ${item.description}\n`;

      if (item.variants && item.variants.length > 0) {
        const sizes = item.variants
          .map((v) => `${v.name}: ₹${(v.price / 100).toFixed(0)}`)
          .join(', ');
        context += `   Sizes: ${sizes}\n`;
      }

      context += '\n';
    }
  }

  return context;
}

// ─── Search Menu Items ──────────────────────

export async function searchMenuItems(
  restaurantId: string,
  query: string
): Promise<MenuItem[]> {
  const { data } = await supabaseAdmin
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)
    .ilike('name', `%${query}%`)
    .limit(10);

  return ((data || []) as Record<string, unknown>[]).map((item) => ({
    id: item.id as string,
    category_id: item.category_id as string,
    category_name: (item.menu_categories as Record<string, string>)?.name,
    name: item.name as string,
    description: item.description as string | undefined,
    price: item.price as number,
    is_veg: item.is_veg as boolean,
    is_bestseller: item.is_bestseller as boolean,
    is_available: item.is_available as boolean,
    prep_time_minutes: (item.prep_time_minutes as number) || 15,
  }));
}

// ─── Get Item by ID ─────────────────────────

export async function getMenuItemById(itemId: string): Promise<MenuItem | null> {
  const { data } = await supabaseAdmin
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('id', itemId)
    .single();

  if (!data) return null;
  const item = data as Record<string, unknown>;

  return {
    id: item.id as string,
    category_id: item.category_id as string,
    category_name: (item.menu_categories as Record<string, string>)?.name,
    name: item.name as string,
    description: item.description as string | undefined,
    price: item.price as number,
    is_veg: item.is_veg as boolean,
    is_bestseller: item.is_bestseller as boolean,
    is_available: item.is_available as boolean,
    prep_time_minutes: (item.prep_time_minutes as number) || 15,
  };
}
