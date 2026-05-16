// ============================================
// AssistMint — Coupon Server Actions
// Coupon CRUD for dashboard
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Coupons ────────────────────────────

export async function getCoupons(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Create Coupon ──────────────────────────

export async function createCoupon(
  restaurantId: string,
  coupon: {
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    min_order_amount?: number;
    max_discount?: number;
    max_uses?: number;
    valid_from?: string;
    valid_until?: string;
    description?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Check code uniqueness within restaurant
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('code', coupon.code.toUpperCase())
    .single();

  if (existing) {
    return { error: 'Coupon code already exists.' };
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      restaurant_id: restaurantId,
      code: coupon.code.toUpperCase(),
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      max_discount: coupon.max_discount || null,
      max_uses: coupon.max_uses || null,
      current_uses: 0,
      valid_from: coupon.valid_from || new Date().toISOString(),
      valid_until: coupon.valid_until || null,
      is_active: true,
      description: coupon.description || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.COUPON_CREATED,
    details: { couponCode: coupon.code, discountType: coupon.discount_type },
  });

  revalidatePath('/dashboard/coupons');
  return { data };
}

// ─── Update Coupon ──────────────────────────

export async function updateCoupon(
  restaurantId: string,
  couponId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', couponId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/coupons');
  return { success: true };
}

// ─── Delete Coupon ──────────────────────────

export async function deleteCoupon(restaurantId: string, couponId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/coupons');
  return { success: true };
}

// ─── Toggle Coupon Active ───────────────────

export async function toggleCouponActive(
  restaurantId: string,
  couponId: string,
  isActive: boolean
) {
  return updateCoupon(restaurantId, couponId, { is_active: isActive });
}

// ─── Validate Coupon (for AI/checkout) ──────

export async function validateCoupon(
  restaurantId: string,
  code: string,
  orderAmount: number
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!data) return { valid: false, error: 'Invalid coupon code.' };

  const coupon = data as Record<string, unknown>;
  const now = new Date();

  // Check validity period
  if (coupon.valid_until && new Date(coupon.valid_until as string) < now) {
    return { valid: false, error: 'This coupon has expired.' };
  }
  if (coupon.valid_from && new Date(coupon.valid_from as string) > now) {
    return { valid: false, error: 'This coupon is not yet active.' };
  }

  // Check usage limit
  if (coupon.max_uses && (coupon.current_uses as number) >= (coupon.max_uses as number)) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // Check min order
  if (orderAmount < (coupon.min_order_amount as number || 0)) {
    const minAmount = ((coupon.min_order_amount as number || 0) / 100).toFixed(0);
    return { valid: false, error: `Minimum order ₹${minAmount} required.` };
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round(orderAmount * (coupon.discount_value as number) / 100);
    if (coupon.max_discount && discount > (coupon.max_discount as number)) {
      discount = coupon.max_discount as number;
    }
  } else {
    discount = coupon.discount_value as number;
  }

  return { valid: true, discount, couponId: coupon.id as string };
}
