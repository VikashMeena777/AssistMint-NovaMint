// ============================================
// AssistMint — Cart Engine
// Manages customer cart sessions in Supabase
// ============================================

import { createClient } from '@supabase/supabase-js';

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
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
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
    .eq('is_active', true)
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
      subtotal: cart.subtotal as number || 0,
      coupon_code: cart.coupon_code as string | undefined,
      discount_amount: cart.discount_amount as number || 0,
      delivery_fee: cart.delivery_fee as number || 0,
      tax_amount: cart.tax_amount as number || 0,
      total_amount: cart.total_amount as number || 0,
    };
  }

  // Create new cart
  const { data: newCart } = await supabaseAdmin
    .from('cart_sessions')
    .insert({
      restaurant_id: restaurantId,
      customer_id: customerId,
      items: [],
      subtotal: 0,
      discount_amount: 0,
      delivery_fee: 0,
      tax_amount: 0,
      total_amount: 0,
      is_active: true,
    })
    .select()
    .single();

  const cart = newCart as Record<string, unknown>;
  return {
    id: cart.id as string,
    restaurant_id: restaurantId,
    customer_id: customerId,
    items: [],
    subtotal: 0,
    discount_amount: 0,
    delivery_fee: 0,
    tax_amount: 0,
    total_amount: 0,
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

  // 5% GST on food
  const taxAmount = Math.round(subtotal * 0.05);
  const deliveryFee = (cart.delivery_fee as number) || 0;
  const discountAmount = (cart.discount_amount as number) || 0;
  const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

  const { data: updated } = await supabaseAdmin
    .from('cart_sessions')
    .update({
      items,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartId)
    .select()
    .single();

  const result = updated as Record<string, unknown>;
  return {
    id: cartId,
    restaurant_id: result.restaurant_id as string,
    customer_id: result.customer_id as string,
    items,
    subtotal,
    coupon_code: result.coupon_code as string | undefined,
    discount_amount: discountAmount,
    delivery_fee: deliveryFee,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };
}

// ─── Format Cart for WhatsApp ───────────────

export function formatCartForWhatsApp(cart: Cart): string {
  if (cart.items.length === 0) {
    return '🛒 Your cart is empty! Browse our menu to add items.';
  }

  let text = '🛒 *Your Cart*\n━━━━━━━━━━━━━━━\n';

  cart.items.forEach((item, i) => {
    const price = (item.unit_price * item.quantity) / 100;
    const variant = item.variant_name ? ` (${item.variant_name})` : '';
    text += `${i + 1}. ${item.item_name}${variant}\n`;
    text += `   ${item.quantity}x ₹${(item.unit_price / 100).toFixed(0)} = ₹${price.toFixed(0)}\n`;

    if (item.addon_names && item.addon_names.length > 0) {
      text += `   + ${item.addon_names.join(', ')}\n`;
    }
  });

  text += '━━━━━━━━━━━━━━━\n';
  text += `Subtotal: ₹${(cart.subtotal / 100).toFixed(0)}\n`;
  text += `GST (5%): ₹${(cart.tax_amount / 100).toFixed(0)}\n`;
  if (cart.delivery_fee > 0) text += `Delivery: ₹${(cart.delivery_fee / 100).toFixed(0)}\n`;
  if (cart.discount_amount > 0) text += `Discount: -₹${(cart.discount_amount / 100).toFixed(0)}\n`;
  text += `\n*Total: ₹${(cart.total_amount / 100).toFixed(0)}*`;

  return text;
}

// ─── Convert Cart to Order ──────────────────

export async function convertCartToOrder(
  cart: Cart,
  orderType: 'delivery' | 'pickup' | 'dine_in' = 'delivery',
  deliveryAddress?: string,
  specialInstructions?: string
): Promise<string> {
  // Generate order number: AM-XXXXXX
  const orderNumber = `AM-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data: order } = await supabaseAdmin
    .from('orders')
    .insert({
      restaurant_id: cart.restaurant_id,
      customer_id: cart.customer_id,
      order_number: orderNumber,
      status: 'placed',
      order_type: orderType,
      items: cart.items,
      subtotal: cart.subtotal,
      tax_amount: cart.tax_amount,
      delivery_fee: cart.delivery_fee,
      discount_amount: cart.discount_amount,
      total_amount: cart.total_amount,
      coupon_code: cart.coupon_code,
      special_instructions: specialInstructions,
      delivery_address: deliveryAddress,
      placed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  // Deactivate the cart
  await supabaseAdmin
    .from('cart_sessions')
    .update({ is_active: false })
    .eq('id', cart.id);

  return (order as Record<string, string>)?.id || '';
}
