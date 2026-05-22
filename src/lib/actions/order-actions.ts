// ============================================
// AssistMint — Order Server Actions
// Order management for dashboard
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Orders ─────────────────────────────

export async function getOrders(
  restaurantId: string,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentStatus?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('*, customers(saved_name, whatsapp_name, phone)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    // Search by order number OR customer phone
    query = query.or(`order_number.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    // Add 1 day to dateTo so it includes the entire end date
    const end = new Date(filters.dateTo);
    end.setDate(end.getDate() + 1);
    query = query.lt('created_at', end.toISOString());
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    query = query.eq('payment_status', filters.paymentStatus);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}

// ─── Get Single Order ───────────────────────

export async function getOrder(restaurantId: string, orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(saved_name, whatsapp_name, phone, email)')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Update Order Status ────────────────────

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const updates: Record<string, unknown> = { status };

  // Set timestamps based on status
  switch (status) {
    case 'confirmed':
      updates.confirmed_at = new Date().toISOString();
      break;
    case 'preparing':
      updates.preparing_at = new Date().toISOString();
      break;
    case 'ready':
      updates.ready_at = new Date().toISOString();
      break;
    case 'delivered':
      updates.delivered_at = new Date().toISOString();
      break;
    case 'cancelled':
      updates.cancelled_at = new Date().toISOString();
      break;
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  // Map status to action
  const actionMap: Record<string, string> = {
    confirmed: ACTIONS.ORDER_CONFIRMED,
    preparing: ACTIONS.ORDER_PREPARING,
    ready: ACTIONS.ORDER_READY,
    delivered: ACTIONS.ORDER_DELIVERED,
    cancelled: ACTIONS.ORDER_CANCELLED,
  };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: actionMap[status] || status,
    details: { orderId, newStatus: status },
  });

  // Send WhatsApp notification to customer (fire-and-forget)
  sendOrderStatusWhatsApp(restaurantId, orderId, status).catch(e => console.error('[Orders] WhatsApp status notification failed:', e));

  revalidatePath('/dashboard/orders');
  return { success: true };
}

// ─── WhatsApp Order Status Notification ─────

async function sendOrderStatusWhatsApp(
  restaurantId: string,
  orderId: string,
  status: string
) {
  const { createClient: createAdmin } = await import('@supabase/supabase-js');
  const supabaseAdmin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Get order + customer phone + email + items
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('order_number, customer_phone, total, items, customers(saved_name, whatsapp_name, email)')
    .eq('id', orderId)
    .single();

  if (!order?.customer_phone) return;

  // Get restaurant WhatsApp creds
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('name, whatsapp_phone_id, whatsapp_access_token')
    .eq('id', restaurantId)
    .single();

  if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) return;

  // Send email notification to customer if they have an email address
  const customer = order?.customers as any;
  if (customer?.email) {
    const { sendOrderStatusEmail } = await import('@/lib/email/email-service');
    sendOrderStatusEmail({
      customerEmail: customer.email,
      customerName: customer.saved_name || customer.whatsapp_name || 'Valued Customer',
      orderNumber: order.order_number || orderId,
      restaurantName: restaurant.name || 'AssistMint Partner',
      status,
      total: order.total || 0,
      items: (order.items as any) || [],
    }).catch(e => console.error('[Orders] Email status notification failed:', e));
  }

  const statusMessages: Record<string, string> = {
    confirmed: '✅ *Order #ORDER confirmed!*\nWe\'re getting it ready for you.',
    preparing: '👨‍🍳 *Order #ORDER is being prepared!*\nHang tight, almost ready.',
    ready: '📦 *Order #ORDER is ready!*\nPickup/delivery coming soon 🎉',
    out_for_delivery: '🚗 *Order #ORDER is on its way!*\nAlmost there.',
    delivered: '🎉 *Order #ORDER delivered!*\nEnjoy your meal from *RESTAURANT*! 🌿',
    cancelled: '❌ *Order #ORDER cancelled.*\nQuestions? Just message us.',
  };

  let msg = statusMessages[status];
  if (!msg) return;

  msg = msg.replace(/ORDER/g, order.order_number || orderId);
  msg = msg.replace(/RESTAURANT/g, restaurant.name || '');

  try {
    await fetch(`https://graph.facebook.com/v21.0/${restaurant.whatsapp_phone_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restaurant.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: order.customer_phone,
        type: 'text',
        text: { body: msg },
      }),
    });

    // On delivery: send receipt + feedback request (non-blocking, delayed)
    if (status === 'delivered') {
      const { sendOrderReceipt, sendFeedbackRequest } = await import('@/lib/ai/orchestrator');
      const { getRestaurantById } = await import('@/lib/services/restaurant-service');
      const fullRestaurant = await getRestaurantById(restaurantId);

      if (fullRestaurant) {
        // Send receipt immediately
        await sendOrderReceipt(fullRestaurant, orderId, order.customer_phone).catch(e => console.error('[Orders] Receipt send failed:', e));

        // Wait 3 seconds, then send feedback request (must await — setTimeout dies on serverless)
        await new Promise(resolve => setTimeout(resolve, 3000));
        await sendFeedbackRequest(fullRestaurant, orderId, order.customer_phone).catch(e => console.error('[Orders] Feedback request failed:', e));
      }
    }
  } catch {
    // Silent fail — don't block order update
  }
}

// ─── Get Order Stats ────────────────────────

export async function getOrderStats(restaurantId: string) {
  const supabase = await createClient();

  // Get counts by status
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
  const counts: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', status);
    counts[status] = count || 0;
  }

  // Today's revenue
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', today.toISOString());

  const todayRevenue = (todayOrders || []).reduce(
    (sum, o) => sum + ((o as Record<string, unknown>).total as number || 0),
    0
  );

  return { counts, todayRevenue, totalActive: counts.pending + counts.confirmed + counts.preparing + counts.ready };
}

// ─── Export Orders as CSV ────────────────────

export async function exportOrdersCsv(
  restaurantId: string,
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentStatus?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', csv: null };

  let query = supabase
    .from('orders')
    .select('order_number, customer_phone, items, subtotal, tax, delivery_fee, total, payment_method, payment_status, status, delivery_type, delivery_address, rating, feedback, created_at, delivered_at, customers(saved_name, whatsapp_name, phone)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    const end = new Date(filters.dateTo);
    end.setDate(end.getDate() + 1);
    query = query.lt('created_at', end.toISOString());
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    query = query.eq('payment_status', filters.paymentStatus);
  }

  const { data, error } = await query.limit(5000);
  if (error) return { error: error.message, csv: null };

  // Build CSV
  const headers = [
    'Order #', 'Date', 'Customer', 'Phone', 'Items', 'Subtotal (₹)', 'Tax (₹)',
    'Delivery Fee (₹)', 'Total (₹)', 'Payment Method', 'Payment Status',
    'Order Status', 'Type', 'Address', 'Rating', 'Feedback', 'Delivered At',
  ];

  const rows = (data || []).map((o: Record<string, unknown>) => {
    const cust = o.customers as Record<string, string> | null;
    const items = (o.items as Array<Record<string, unknown>> || []).map(
      (i) => `${i.quantity}x ${i.item_name}`
    ).join('; ');

    const rawAddress = o.delivery_address;
    let addressStr = '';
    if (rawAddress) {
      if (typeof rawAddress === 'object') {
        addressStr = (rawAddress as any).raw || (rawAddress as any).full_address || JSON.stringify(rawAddress);
      } else {
        addressStr = String(rawAddress);
      }
    }

    return [
      o.order_number || '',
      new Date(o.created_at as string).toLocaleString('en-IN'),
      cust?.saved_name || cust?.whatsapp_name || '',
      cust?.phone || o.customer_phone || '',
      `"${items.replace(/"/g, '""')}"`,
      ((o.subtotal as number || 0) / 100).toFixed(2),
      ((o.tax as number || 0) / 100).toFixed(2),
      ((o.delivery_fee as number || 0) / 100).toFixed(2),
      ((o.total as number || 0) / 100).toFixed(2),
      o.payment_method || 'cod',
      o.payment_status || '',
      o.status || '',
      o.delivery_type || '',
      `"${addressStr.replace(/"/g, '""')}"`,
      o.rating || '',
      `"${((o.feedback as string) || '').replace(/"/g, '""')}"`,
      o.delivered_at ? new Date(o.delivered_at as string).toLocaleString('en-IN') : '',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  return { csv, error: null };
}
