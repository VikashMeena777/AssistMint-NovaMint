// ============================================
// AssistMint — Inquiry / Lead Service
// CRUD for customer inquiries (education, healthcare, services)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface Inquiry {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  interest: string;
  message: string | null;
  source: string;
  status: 'new' | 'contacted' | 'interested' | 'enrolled' | 'closed';
  follow_up_notes: string | null;
  followed_up_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Inquiry ─────────────────────────

export async function createInquiry(data: {
  restaurant_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  interest: string;
  message?: string;
  source?: string;
}): Promise<{ inquiry: Inquiry | null; error: string | null }> {
  const { data: result, error } = await supabaseAdmin
    .from('inquiries')
    .insert({
      restaurant_id: data.restaurant_id,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
      interest: data.interest,
      message: data.message || null,
      source: data.source || 'whatsapp',
    })
    .select()
    .single();

  if (error) return { inquiry: null, error: error.message };
  return { inquiry: result as unknown as Inquiry, error: null };
}

// ─── Get Inquiries ──────────────────────────

export async function getInquiries(
  restaurantId: string,
  filters?: {
    status?: string;
    from_date?: string;
    to_date?: string;
  }
): Promise<Inquiry[]> {
  let query = supabaseAdmin
    .from('inquiries')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.from_date) {
    query = query.gte('created_at', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('created_at', filters.to_date);
  }

  const { data } = await query.limit(100);
  return (data || []) as unknown as Inquiry[];
}

// ─── Update Inquiry Status ──────────────────

export async function updateInquiryStatus(
  inquiryId: string,
  status: Inquiry['status'],
  notes?: string
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes) {
    updates.follow_up_notes = notes;
    updates.followed_up_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('inquiries')
    .update(updates)
    .eq('id', inquiryId);

  return { error: error?.message || null };
}

// ─── Get Inquiry Count ──────────────────────

export async function getInquiryCount(restaurantId: string): Promise<{
  total: number;
  new_count: number;
  contacted: number;
}> {
  const { data } = await supabaseAdmin
    .from('inquiries')
    .select('status')
    .eq('restaurant_id', restaurantId);

  const all = (data || []) as unknown as Array<{ status: string }>;
  return {
    total: all.length,
    new_count: all.filter((i) => i.status === 'new').length,
    contacted: all.filter((i) => i.status === 'contacted').length,
  };
}
