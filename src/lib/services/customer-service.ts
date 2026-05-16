// ============================================
// AssistMint — Customer Service
// Auto-creates and manages customer profiles
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export interface Customer {
  id: string;
  restaurant_id: string;
  phone: string;
  name?: string;
  whatsapp_name?: string;
  language_preference: string;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: string;
  is_blocked: boolean;
}

// ─── Get or Create Customer ─────────────────

export async function getOrCreateCustomer(
  restaurantId: string,
  phone: string,
  whatsappName?: string
): Promise<Customer> {
  // Try to find existing customer
  const { data: existing, error: findError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('phone', phone)
    .single();

  if (existing && !findError) {
    const c = existing as Record<string, unknown>;

    // Update WhatsApp name if changed
    if (whatsappName && c.whatsapp_name !== whatsappName) {
      await supabaseAdmin
        .from('customers')
        .update({ whatsapp_name: whatsappName })
        .eq('id', c.id as string);
    }

    return {
      id: c.id as string,
      restaurant_id: c.restaurant_id as string,
      phone: c.phone as string,
      name: (c.saved_name as string | undefined) || (c.whatsapp_name as string | undefined),
      whatsapp_name: whatsappName || (c.whatsapp_name as string | undefined),
      language_preference: (c.preferred_language as string) || 'en',
      total_orders: (c.total_orders as number) || 0,
      total_spent: (c.total_spent as number) || 0,
      loyalty_points: (c.loyalty_points as number) || 0,
      loyalty_tier: (c.loyalty_tier as string) || 'bronze',
      is_blocked: (c.is_blocked as boolean) || false,
    };
  }

  // Create new customer
  const { data: newCustomer, error: insertError } = await supabaseAdmin
    .from('customers')
    .insert({
      restaurant_id: restaurantId,
      phone,
      whatsapp_name: whatsappName,
      saved_name: whatsappName,
      preferred_language: 'en',
    })
    .select()
    .single();

  if (insertError || !newCustomer) {
    console.error('[CustomerService] Failed to create customer:', insertError?.message);
    // Return a safe fallback to prevent crash
    return {
      id: 'unknown',
      restaurant_id: restaurantId,
      phone,
      name: whatsappName,
      whatsapp_name: whatsappName,
      language_preference: 'en',
      total_orders: 0,
      total_spent: 0,
      loyalty_points: 0,
      loyalty_tier: 'bronze',
      is_blocked: false,
    };
  }

  const c = newCustomer as Record<string, unknown>;
  return {
    id: c.id as string,
    restaurant_id: restaurantId,
    phone,
    name: whatsappName,
    whatsapp_name: whatsappName,
    language_preference: 'en',
    total_orders: 0,
    total_spent: 0,
    loyalty_points: 0,
    loyalty_tier: 'bronze',
    is_blocked: false,
  };
}

// ─── Update Order Stats ─────────────────────

export async function updateCustomerOrderStats(
  customerId: string,
  orderAmount: number
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('customers')
    .select('total_orders, total_spent, loyalty_points')
    .eq('id', customerId)
    .single();

  if (!data) return;
  const c = data as Record<string, number>;

  const newOrders = (c.total_orders || 0) + 1;
  const newSpent = (c.total_spent || 0) + orderAmount;

  // 1 point per ₹10 spent
  const pointsEarned = Math.floor(orderAmount / 1000);
  const newPoints = (c.loyalty_points || 0) + pointsEarned;

  // Calculate tier
  let tier = 'bronze';
  if (newPoints >= 2500) tier = 'platinum';
  else if (newPoints >= 1000) tier = 'gold';
  else if (newPoints >= 500) tier = 'silver';

  await supabaseAdmin
    .from('customers')
    .update({
      total_orders: newOrders,
      total_spent: newSpent,
      loyalty_points: newPoints,
      loyalty_tier: tier,
      last_order_at: new Date().toISOString(),
    })
    .eq('id', customerId);
}
