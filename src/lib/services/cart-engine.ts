// ============================================
// AssistMint — Cart Engine
// Manages customer cart sessions in Supabase
// ============================================

import { createClient } from '@supabase/supabase-js';
import { getPlanConfig, isUnlimited } from '@/lib/utils/plan-limits';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface CartItem {
  item_id: string;
  item_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number; // in paise
  addon_ids?: string[];
  addon_names?: string[];
  addons_total?: number; // in paise
  special_instructions?: string;
}

export interface Cart {
  id: string;
  restaurant_id: string;
  customer_id: string;
  items: CartItem[];
  subtotal: number;
  coupon_code?: string;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
}

// ─── Get or Create Cart ─────────────────────

export async function getOrCreateCart(
  restaurantId: string,
  customerId: string
): Promise<Cart> {
  // Try to get existing active cart
  const { data: existing } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const cart = existing as Record<string, unknown>;
    return {
      id: cart.id as string,
      restaurant_id: cart.restaurant_id as string,
      customer_id: cart.customer_id as string,
      items: (cart.items as CartItem[]) || [],
      subtotal: (cart.subtotal as number) || 0,
      coupon_code: cart.coupon_code as string | undefined,
      discount: (cart.discount as number) || 0,
      delivery_fee: (cart.delivery_fee as number) || 0,
      tax: (cart.tax as number) || 0,
      total: (cart.total as number) || 0,
    };
  }

  // Create new cart
  const { data: newCart, error } = await supabaseAdmin
    .from('cart_sessions')
    .insert({
      restaurant_id: restaurantId,
      customer_id: customerId,
      items: [],
      subtotal: 0,
      discount: 0,
      delivery_fee: 0,
      tax: 0,
      total: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error || !newCart) {
    console.error('[CartEngine] Failed to create cart:', error?.message);
    // Return safe fallback
    return {
      id: 'temp-cart',
      restaurant_id: restaurantId,
      customer_id: customerId,
      items: [],
      subtotal: 0,
      discount: 0,
      delivery_fee: 0,
      tax: 0,
      total: 0,
    };
  }

  const cart = newCart as Record<string, unknown>;
  return {
    id: cart.id as string,
    restaurant_id: restaurantId,
    customer_id: customerId,
    items: [],
    subtotal: 0,
    discount: 0,
    delivery_fee: 0,
    tax: 0,
    total: 0,
  };
}

// ─── Add Item to Cart ───────────────────────

export async function addToCart(
  cartId: string,
  item: CartItem
): Promise<Cart> {
  const { data: cartData } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('id', cartId)
    .single();

  if (!cartData) throw new Error('Cart not found');

  const cart = cartData as Record<string, unknown>;
  const items = [...((cart.items as CartItem[]) || [])];

  // Check if same item+variant exists, increment quantity
  const existingIdx = items.findIndex(
    (i) => i.item_id === item.item_id && i.variant_id === item.variant_id
  );

  if (existingIdx >= 0) {
    items[existingIdx].quantity += item.quantity;
  } else {
    items.push(item);
  }

  return await recalculateAndSave(cartId, items, cart);
}

// ─── Remove Item from Cart ──────────────────

export async function removeFromCart(
  cartId: string,
  itemId: string,
  variantId?: string
): Promise<Cart> {
  const { data: cartData } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('id', cartId)
    .single();

  if (!cartData) throw new Error('Cart not found');

  const cart = cartData as Record<string, unknown>;
  const items = ((cart.items as CartItem[]) || []).filter(
    (i) => !(i.item_id === itemId && i.variant_id === (variantId || i.variant_id))
  );

  return await recalculateAndSave(cartId, items, cart);
}

// ─── Update Quantity ────────────────────────

export async function updateCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
  variantId?: string
): Promise<Cart> {
  const { data: cartData } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('id', cartId)
    .single();

  if (!cartData) throw new Error('Cart not found');

  const cart = cartData as Record<string, unknown>;
  let items = [...((cart.items as CartItem[]) || [])];

  if (quantity <= 0) {
    items = items.filter(
      (i) => !(i.item_id === itemId && i.variant_id === (variantId || i.variant_id))
    );
  } else {
    const idx = items.findIndex(
      (i) => i.item_id === itemId && i.variant_id === (variantId || i.variant_id)
    );
    if (idx >= 0) items[idx].quantity = quantity;
  }

  return await recalculateAndSave(cartId, items, cart);
}

// ─── Clear Cart ─────────────────────────────

export async function clearCart(cartId: string): Promise<Cart> {
  const { data: cartData } = await supabaseAdmin
    .from('cart_sessions')
    .select('*')
    .eq('id', cartId)
    .single();

  if (!cartData) throw new Error('Cart not found');

  return await recalculateAndSave(cartId, [], cartData as Record<string, unknown>);
}

// ─── Recalculate & Persist ──────────────────

async function recalculateAndSave(
  cartId: string,
  items: CartItem[],
  cart: Record<string, unknown>
): Promise<Cart> {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.unit_price * item.quantity + (item.addons_total || 0) * item.quantity,
    0
  );

  const discount = (cart.discount as number) || 0;

  // Read tax_rate + delivery_fee_rules from restaurant settings
  let tax = 0;
  let deliveryFee = (cart.delivery_fee as number) || 0;
  try {
    const restaurantId = cart.restaurant_id as string;
    if (restaurantId) {
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('tax_rate, delivery_fee_rules')
        .eq('id', restaurantId)
        .single();

      if (restaurant) {
        const r = restaurant as Record<string, unknown>;

        // Tax: tax_rate is stored as percentage × 100 (500 = 5%). Default 5%
        const taxRate = (r.tax_rate as number) ?? 500;
        if (taxRate > 0) {
          tax = Math.round(subtotal * (taxRate / 10000));
        }

        // Delivery fee
        const rules = r.delivery_fee_rules as {
          flat_fee?: number;
          free_above?: number;
          enabled?: boolean;
        } | null;

        if (rules?.enabled && rules.flat_fee) {
          if (rules.free_above && subtotal >= rules.free_above) {
            deliveryFee = 0;
          } else {
            deliveryFee = rules.flat_fee;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[CartEngine] Error reading restaurant settings:', e);
  }

  const total = subtotal + tax + deliveryFee - discount;

  const { data: updated } = await supabaseAdmin
    .from('cart_sessions')
    .update({
      items,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartId)
    .select()
    .single();

  const result = (updated || cart) as Record<string, unknown>;
  return {
    id: cartId,
    restaurant_id: result.restaurant_id as string,
    customer_id: result.customer_id as string,
    items,
    subtotal,
    coupon_code: result.coupon_code as string | undefined,
    discount,
    delivery_fee: deliveryFee,
    tax,
    total,
  };
}

// ─── Format Cart for WhatsApp ───────────────

export function formatCartForWhatsApp(cart: Cart): string {
  if (cart.items.length === 0) {
    return '🛒 Your cart is empty! Browse our menu to add items.';
  }

  let text = '🛒 *Your Cart*\n';

  cart.items.forEach((item, i) => {
    const price = (item.unit_price * item.quantity) / 100;
    const variant = item.variant_name ? ` (${item.variant_name})` : '';
    text += `${i + 1}. ${item.item_name}${variant} × ${item.quantity} — ₹${price.toFixed(0)}\n`;
    if (item.addon_names && item.addon_names.length > 0) {
      text += `   + ${item.addon_names.join(', ')}\n`;
    }
    if (item.special_instructions) {
      text += `   📝 _${item.special_instructions}_\n`;
    }
  });

  text += `— — — — — —\n`;
  text += `Subtotal: ₹${(cart.subtotal / 100).toFixed(0)}\n`;
  if (cart.tax > 0) text += `Tax (5%): ₹${(cart.tax / 100).toFixed(0)}\n`;
  if (cart.delivery_fee > 0) text += `🚚 Delivery: ₹${(cart.delivery_fee / 100).toFixed(0)}\n`;
  if (cart.discount > 0) text += `🎉 Discount: -₹${(cart.discount / 100).toFixed(0)}\n`;
  text += `*Total: ₹${(cart.total / 100).toFixed(0)}*`;

  return text;
}

// ─── Convert Cart to Order ──────────────────

export async function convertCartToOrder(
  cart: Cart,
  orderType: 'delivery' | 'pickup' | 'dine_in' = 'delivery',
  deliveryAddress?: string,
  specialInstructions?: string,
  paymentMethod: 'cod' | 'online' = 'cod'
): Promise<string> {
  // Lookup customer phone from customers table
  let customerPhone = '';
  let customerName = '';
  const { data: cust } = await supabaseAdmin
    .from('customers')
    .select('phone, saved_name, whatsapp_name')
    .eq('id', cart.customer_id)
    .single();
  if (cust) {
    customerPhone = (cust as Record<string, string>).phone || '';
    customerName = (cust as Record<string, string>).saved_name || (cust as Record<string, string>).whatsapp_name || '';
  }

  let finalAddress = deliveryAddress;
  if (!finalAddress && orderType === 'delivery') {
    const { data: sessionData } = await supabaseAdmin
      .from('cart_sessions')
      .select('metadata')
      .eq('id', cart.id)
      .single();
    if (sessionData && sessionData.metadata) {
      finalAddress = (sessionData.metadata as any).delivery_address || undefined;
    }
  }

  // ── Plan limit check: orders per month ──
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('plan')
    .eq('id', cart.restaurant_id)
    .single();
  const planSlug = (restaurant as Record<string, unknown>)?.plan as string || 'free';
  const planConfig = getPlanConfig(planSlug);
  if (!isUnlimited(planConfig.orders)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', cart.restaurant_id)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);
    if ((orderCount || 0) >= planConfig.orders) {
      console.warn(`[CartEngine] Order limit reached for restaurant ${cart.restaurant_id} (${orderCount}/${planConfig.orders})`);
      return '';
    }
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      restaurant_id: cart.restaurant_id,
      customer_id: cart.customer_id,
      customer_phone: customerPhone,
      customer_name: customerName,
      items: cart.items,
      subtotal: cart.subtotal,
      tax: cart.tax,
      delivery_fee: cart.delivery_fee,
      discount: cart.discount,
      total: cart.total,
      coupon_code: cart.coupon_code,
      notes: specialInstructions,
      delivery_address: finalAddress ? { raw: finalAddress } : null,
      delivery_type: orderType,
      status: 'pending',
      payment_status: paymentMethod === 'cod' ? 'cod_pending' : 'pending',
      payment_method: paymentMethod,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[CartEngine] Failed to create order:', error.message);
    return '';
  }

  // Deactivate the cart
  await supabaseAdmin
    .from('cart_sessions')
    .update({ status: 'converted' })
    .eq('id', cart.id);

  return (order as Record<string, string>)?.id || '';
}
