// ============================================
// AssistMint — Restaurant / Business Service
// Lookup business by WhatsApp phone number ID
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { BusinessType } from '@/lib/utils/business-types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  cuisine?: string;
  ai_persona: string;
  languages: string[];
  whatsapp_phone_id?: string;
  whatsapp_token?: string;
  owner_whatsapp?: string;
  plan: string;
  min_order_amount: number;
  business_hours: Record<string, unknown>;
  tax_rate: number;            // percentage × 100 (e.g., 500 = 5%). 0 = no tax
  delivery_fee_rules: {
    flat_fee?: number;         // in paise (e.g., 3000 = ₹30)
    free_above?: number;       // free delivery if subtotal >= this (in paise)
    enabled?: boolean;
  };
  address?: string;
  // Multi-business fields
  business_type: BusinessType;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  business_config: Record<string, unknown>;
  google_review_url?: string;
}

// ─── Lookup by WhatsApp Phone ID ────────────

export async function getRestaurantByPhoneId(phoneNumberId: string): Promise<Restaurant | null> {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('whatsapp_phone_id', phoneNumberId)
    .eq('is_active', true)
    .single();

  if (!data) return null;
  const r = data as Record<string, unknown>;

  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    phone: r.phone as string | undefined,
    cuisine: (r.cuisine_type as string) || undefined,
    ai_persona: (r.ai_persona as string) || 'You are a friendly restaurant ordering assistant.',
    languages: (r.supported_languages as string[]) || ['en'],
    whatsapp_phone_id: r.whatsapp_phone_id as string | undefined,
    whatsapp_token: r.whatsapp_access_token as string | undefined,
    owner_whatsapp: (r.owner_whatsapp as string) || undefined,
    plan: (r.plan as string) || 'starter',
    min_order_amount: (r.min_order_amount as number) || 0,
    tax_rate: (r.tax_rate as number) ?? 500, // default 5% (500 = 5.00%)
    business_hours: (r.business_hours as Record<string, unknown>) || {},
    delivery_fee_rules: (r.delivery_fee_rules as Restaurant['delivery_fee_rules']) || { flat_fee: 0, free_above: 0, enabled: false },
    address: (r.address as string) || undefined,
    business_type: (r.business_type as BusinessType) || 'food_beverage',
    delivery_enabled: (r.delivery_enabled as boolean) ?? false,
    pickup_enabled: (r.pickup_enabled as boolean) ?? true,
    business_config: (r.business_config as Record<string, unknown>) || {},
  };
}

// ─── Get by ID ──────────────────────────────

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) return null;
  const r = data as Record<string, unknown>;

  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    phone: r.phone as string | undefined,
    cuisine: (r.cuisine_type as string) || undefined,
    ai_persona: (r.ai_persona as string) || 'You are a friendly restaurant ordering assistant.',
    languages: (r.supported_languages as string[]) || ['en'],
    whatsapp_phone_id: r.whatsapp_phone_id as string | undefined,
    whatsapp_token: r.whatsapp_access_token as string | undefined,
    owner_whatsapp: (r.owner_whatsapp as string) || undefined,
    plan: (r.plan as string) || 'starter',
    min_order_amount: (r.min_order_amount as number) || 0,
    tax_rate: (r.tax_rate as number) ?? 500,
    business_hours: (r.business_hours as Record<string, unknown>) || {},
    delivery_fee_rules: (r.delivery_fee_rules as Restaurant['delivery_fee_rules']) || { flat_fee: 0, free_above: 0, enabled: false },
    address: (r.address as string) || undefined,
    business_type: (r.business_type as BusinessType) || 'food_beverage',
    delivery_enabled: (r.delivery_enabled as boolean) ?? false,
    pickup_enabled: (r.pickup_enabled as boolean) ?? true,
    business_config: (r.business_config as Record<string, unknown>) || {},
  };
}
