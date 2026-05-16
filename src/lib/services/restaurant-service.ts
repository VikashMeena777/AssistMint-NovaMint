// ============================================
// AssistMint — Restaurant Service
// Lookup restaurant by WhatsApp phone number ID
// ============================================

import { createClient } from '@supabase/supabase-js';

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
  plan: string;
  min_order_amount: number;
  avg_prep_time_min: number;
  business_hours: Record<string, unknown>;
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
    cuisine: r.cuisine as string | undefined,
    ai_persona: (r.ai_persona as string) || 'You are a friendly restaurant ordering assistant.',
    languages: (r.languages as string[]) || ['en'],
    whatsapp_phone_id: r.whatsapp_phone_id as string | undefined,
    whatsapp_token: r.whatsapp_access_token as string | undefined,
    plan: (r.plan as string) || 'starter',
    min_order_amount: (r.min_order_amount as number) || 0,
    avg_prep_time_min: (r.avg_prep_time_min as number) || 30,
    business_hours: (r.business_hours as Record<string, unknown>) || {},
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
    cuisine: r.cuisine as string | undefined,
    ai_persona: (r.ai_persona as string) || 'You are a friendly restaurant ordering assistant.',
    languages: (r.languages as string[]) || ['en'],
    whatsapp_phone_id: r.whatsapp_phone_id as string | undefined,
    whatsapp_token: r.whatsapp_access_token as string | undefined,
    plan: (r.plan as string) || 'starter',
    min_order_amount: (r.min_order_amount as number) || 0,
    avg_prep_time_min: (r.avg_prep_time_min as number) || 30,
    business_hours: (r.business_hours as Record<string, unknown>) || {},
  };
}
