// ============================================
// AssistMint — Public Page Server Actions
// Fetch business data by slug for public pages
// ============================================

'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export interface PublicBusinessData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  business_type: string;
  business_hours: Record<string, { open: string; close: string }>;
  whatsapp_phone: string | null;
  menu_categories: Array<{
    id: string;
    name: string;
    display_order: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      is_veg: boolean;
      is_available: boolean;
    }>;
  }>;
}

/**
 * Fetch a business by its slug for the public page.
 * Only returns active businesses with their menu/services.
 */
export async function getBusinessBySlug(slug: string): Promise<PublicBusinessData | null> {
  // 1. Get business info
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, slug, phone, address, description, business_type, business_hours, whatsapp_phone_id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!restaurant) return null;
  const r = restaurant as Record<string, unknown>;

  // 2. Get menu categories with items
  const { data: categories } = await supabaseAdmin
    .from('menu_categories')
    .select('id, name, display_order')
    .eq('restaurant_id', r.id as string)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const menuCategories: PublicBusinessData['menu_categories'] = [];

  if (categories) {
    for (const cat of categories) {
      const c = cat as Record<string, unknown>;
      const { data: items } = await supabaseAdmin
        .from('menu_items')
        .select('id, name, description, price, image_url, is_veg, is_available')
        .eq('category_id', c.id as string)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      menuCategories.push({
        id: c.id as string,
        name: c.name as string,
        display_order: (c.display_order as number) || 0,
        items: (items || []).map((item) => {
          const i = item as Record<string, unknown>;
          return {
            id: i.id as string,
            name: i.name as string,
            description: (i.description as string) || null,
            price: (i.price as number) || 0,
            image_url: (i.image_url as string) || null,
            is_veg: (i.is_veg as boolean) ?? true,
            is_available: (i.is_available as boolean) ?? true,
          };
        }),
      });
    }
  }

  // We don't expose the actual WhatsApp Business phone_id to the public.
  // Instead we need the customer-facing phone number. For now, use the business phone.
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    phone: (r.phone as string) || null,
    address: (r.address as string) || null,
    description: (r.description as string) || null,
    business_type: (r.business_type as string) || 'food_beverage',
    business_hours: (r.business_hours as Record<string, { open: string; close: string }>) || {},
    whatsapp_phone: (r.phone as string) || null,
    menu_categories: menuCategories,
  };
}
