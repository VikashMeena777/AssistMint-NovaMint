// ============================================
// AssistMint — WhatsApp Catalog Order Webhook
// Converts Meta catalog/cart orders (customer
// submits their in-chat WhatsApp cart) into real
// orders in the merchant dashboard.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { getFullMenu } from '@/lib/services/menu-service';
import { getOrCreateCustomer, updateCustomerOrderStats } from '@/lib/services/customer-service';
import { getOrCreateConversation, saveMessage } from '@/lib/services/conversation-manager';
import { notifyOwnerNewOrder } from '@/lib/services/owner-notifications';
import { sendTextMessage } from '@/lib/whatsapp/client';
import type { Restaurant } from '@/lib/services/restaurant-service';
import type { CartItem } from '@/lib/services/cart-engine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// In-memory dedup on the Meta order/message id — Meta retries webhooks, and
// the same order can arrive both as a message (type 'order') and in value.orders
const processedOrderIds = new Map<string, number>();
const ORDER_DEDUP_MS = 5 * 60 * 1000;

interface ResolvedLineItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
}

/**
 * Handle a Meta catalog order webhook payload:
 * - products[] with product_retailer_id (retailer_id = menu item id),
 *   quantity and item_price — or pricing.line_items[] on the orders field
 * - pricing data → order total
 * - Resolves items against menu_items (by id, fallback by name), inserts a
 *   real order (status 'confirmed', payment_method 'whatsapp_cart'),
 *   notifies the owner and confirms to the customer.
 */
export async function handleOrderWebhook(params: {
  restaurant: Restaurant;
  order: Record<string, unknown>;
  customerPhone?: string;
  customerName?: string;
}): Promise<void> {
  const { restaurant, order } = params;

  // ── Resolve the customer phone (payload shape varies by webhook path) ──
  const customerPhone =
    params.customerPhone ||
    (order.customer as string | undefined) ||
    (order.customer_id as string | undefined) ||
    (order.from as string | undefined);
  if (!customerPhone) {
    console.warn('[OrderWebhook] Catalog order without a customer phone — skipping');
    return;
  }

  // ── Dedup on the Meta order/message id ──
  const metaOrderId = (order.id as string) || '';
  if (metaOrderId) {
    const seenAt = processedOrderIds.get(metaOrderId);
    if (seenAt && Date.now() - seenAt < ORDER_DEDUP_MS) {
      console.log(`[OrderWebhook] Skipping duplicate catalog order ${metaOrderId}`);
      return;
    }
    processedOrderIds.set(metaOrderId, Date.now());
    if (processedOrderIds.size > 500) {
      for (const [key, ts] of processedOrderIds.entries()) {
        if (Date.now() - ts > ORDER_DEDUP_MS) processedOrderIds.delete(key);
      }
    }
  }

  // ── Parse line items: products[] (message payload) or pricing.line_items[] ──
  const pricing = (order.pricing as Record<string, unknown>) || {};
  const rawItems =
    (order.products as Array<Record<string, unknown>>) ||
    (pricing.line_items as Array<Record<string, unknown>>) ||
    [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    console.warn('[OrderWebhook] Catalog order has no line items — skipping');
    return;
  }

  // ── Resolve items against menu_items (retailer_id = menu item id, fallback by name) ──
  const menu = await getFullMenu(restaurant.id);
  const allMenuItems = menu ? menu.categories.flatMap((c) => c.items) : [];
  const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const resolvedItems: ResolvedLineItem[] = [];
  for (const raw of rawItems) {
    const retailerId = String(raw.product_retailer_id || raw.retailer_id || '').trim();
    const quantity = Math.max(1, parseInt(String(raw.quantity ?? '1'), 10) || 1);
    // Meta reports item prices in the currency's smallest unit (paise for
    // INR); when the item resolves to a menu item, the menu price wins.
    const metaItemPricePaise = Math.round(Number(raw.item_price) || 0);

    const menuItem =
      (retailerId ? allMenuItems.find((m) => m.id === retailerId) : undefined) ||
      (retailerId
        ? allMenuItems.find((m) => m.name.toLowerCase() === retailerId.toLowerCase())
        : undefined) ||
      (retailerId ? allMenuItems.find((m) => slug(m.name) === slug(retailerId)) : undefined);

    resolvedItems.push({
      menuItemId: menuItem?.id,
      name: menuItem?.name || retailerId || 'Item',
      quantity,
      unitPricePaise: menuItem ? menuItem.price : metaItemPricePaise,
    });
  }

  if (resolvedItems.every((i) => !i.menuItemId)) {
    console.warn('[OrderWebhook] No order items matched the menu — skipping order creation');
    return;
  }

  // ── Totals: resolved menu prices are authoritative; pricing.total is the fallback ──
  const subtotalPaise = resolvedItems.reduce((sum, i) => sum + i.unitPricePaise * i.quantity, 0);
  const pricingTotalRaw =
    ((pricing.total as Record<string, unknown> | undefined)?.value as number) ||
    (order.total as number) ||
    0;
  const totalPaise = subtotalPaise > 0 ? subtotalPaise : Math.round(pricingTotalRaw);

  // ── Get or create the customer ──
  const customer = await getOrCreateCustomer(restaurant.id, customerPhone, params.customerName);

  // ── Insert the order (convertCartToOrder row shape; confirmed immediately —
  // the customer already submitted the cart inside WhatsApp) ──
  const items: CartItem[] = resolvedItems.map((i) => ({
    item_id: i.menuItemId || i.name,
    item_name: i.name,
    quantity: i.quantity,
    unit_price: i.unitPricePaise,
  }));

  const orderText = (order.text as string) || '';
  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      restaurant_id: restaurant.id,
      customer_id: customer.id,
      customer_phone: customerPhone,
      customer_name: customer.name || params.customerName || '',
      items,
      subtotal: subtotalPaise,
      tax: 0,
      delivery_fee: 0,
      discount: 0,
      total: totalPaise,
      delivery_type: 'delivery',
      status: 'confirmed',
      payment_status: 'cod_pending',
      payment_method: 'whatsapp_cart',
      notes: orderText ? `WhatsApp catalog order: ${orderText}` : 'WhatsApp catalog order',
    })
    .select('id, order_number')
    .single();

  if (orderError || !orderRow) {
    console.error('[OrderWebhook] Failed to create order:', orderError?.message);
    return;
  }

  const oRow = orderRow as { id: string; order_number?: string | number };
  const shortId = oRow.order_number ? String(oRow.order_number) : oRow.id.substring(0, 8).toUpperCase();

  // Update customer order stats (best-effort)
  updateCustomerOrderStats(customer.id, totalPaise).catch((e) =>
    console.error('[OrderWebhook] Failed to update customer stats:', e)
  );

  // Notify the owner (fire-and-forget)
  notifyOwnerNewOrder(restaurant.id, oRow.id).catch((e) =>
    console.error('[OrderWebhook] Owner notification failed:', e)
  );

  // ── Confirm to the customer ──
  const itemLines = items
    .map((i) => `• *${i.item_name}* × ${i.quantity} — ₹${((i.unit_price * i.quantity) / 100).toFixed(0)}`)
    .join('\n');
  const totalRupees = (totalPaise / 100).toFixed(0);
  const confirmation = [
    `✅ *Order Confirmed!*`,
    `━━━━━━━━━━━━━━`,
    `🏪 *${restaurant.name}*`,
    `🏷️ Order #${shortId}`,
    itemLines,
    `💵 *₹${totalRupees}* — Pay on delivery`,
    `━━━━━━━━━━━━━━`,
    `We received your WhatsApp cart order! 🛒`,
    `Send *orders* to track your order.`,
  ].join('\n');

  try {
    if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
      await sendTextMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customerPhone,
        text: confirmation,
      });
    }
    const conversation = await getOrCreateConversation(restaurant.id, customer.id, customerPhone);
    await saveMessage(conversation.id, restaurant.id, 'bot', confirmation, undefined, {
      phone: customerPhone,
    });
  } catch (e) {
    console.error('[OrderWebhook] Failed to send order confirmation to customer:', e);
  }

  console.log(`[OrderWebhook] Created catalog order ${oRow.id} for ${restaurant.name} (₹${totalRupees})`);
}
