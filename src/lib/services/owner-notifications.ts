// ============================================
// AssistMint — Owner Notification Service
// Send order alerts to owner WhatsApp +
// process owner replies for order management
// ============================================

import { createClient } from '@supabase/supabase-js';
import { sendTextMessage, sendReplyButtons, sanitizeWhatsAppNumber } from '@/lib/whatsapp/client';
import { sendNewOrderEmail, sendDailySummaryEmail, sendOrderStatusEmail } from '@/lib/email/email-service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Send WhatsApp to a number ──────────────

async function sendWhatsApp(phoneNumberId: string, accessToken: string, to: string, body: string) {
  await sendTextMessage({
    phoneNumberId,
    accessToken,
    to,
    text: body,
  });
}

// ─── Send WhatsApp with Status Reply Buttons ─

async function sendWhatsAppWithButtons(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
) {
  const buttons: { id: string; title: string }[] = [];
  if (status === 'pending') {
    buttons.push({ id: 'accept', title: '✅ Accept' });
    buttons.push({ id: 'reject', title: '❌ Reject' });
  } else if (status === 'confirmed') {
    buttons.push({ id: 'preparing', title: '👨‍🍳 Preparing' });
    buttons.push({ id: 'ready', title: '📦 Ready' });
    buttons.push({ id: 'delivered', title: '🎉 Delivered' });
  } else if (status === 'preparing') {
    buttons.push({ id: 'ready', title: '📦 Ready' });
    buttons.push({ id: 'delivered', title: '🎉 Delivered' });
  } else if (status === 'ready' || status === 'out_for_delivery') {
    buttons.push({ id: 'delivered', title: '🎉 Delivered' });
  }

  if (buttons.length > 0) {
    try {
      await sendReplyButtons({
        phoneNumberId,
        accessToken,
        to,
        bodyText: body,
        buttons,
      });
    } catch (e) {
      console.warn('[OwnerNotify] Failed to send reply buttons, falling back to text:', e);
      await sendTextMessage({
        phoneNumberId,
        accessToken,
        to,
        text: body,
      });
    }
  } else {
    await sendTextMessage({
      phoneNumberId,
      accessToken,
      to,
      text: body,
    });
  }
}

// ─── Notify Owner: New Order ────────────────

export async function notifyOwnerNewOrder(restaurantId: string, orderId: string): Promise<void> {
  try {
    // Get restaurant with owner phone + email
    const { data: rest } = await supabaseAdmin
      .from('restaurants')
      .select('name, owner_whatsapp, whatsapp_phone_id, whatsapp_access_token, notification_email, notify_new_order')
      .eq('id', restaurantId)
      .single();

    if (!rest) return;
    const hasWhatsApp = rest.owner_whatsapp && rest.whatsapp_phone_id && rest.whatsapp_access_token;
    const hasEmail = rest.notification_email;
    if (!hasWhatsApp && !hasEmail) return;

    // Get order details
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_number, customer_phone, total, items, payment_method, delivery_address')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Get customer name
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('saved_name, whatsapp_name')
      .eq('phone', order.customer_phone)
      .eq('restaurant_id', restaurantId)
      .single();

    const customerName = (customer as any)?.saved_name || (customer as any)?.whatsapp_name || 'Customer';
    const items = (order.items as any[]) || [];
    const itemList = items.map((i: any) => `  ${i.quantity}x ${i.item_name}`).join('\n');
    const totalRupees = ((order.total as number) / 100).toFixed(0);
    const payment = (order.payment_method as string) === 'online' ? '💳 Online' : '💵 COD';
    
    const rawAddress = order.delivery_address;
    let address = 'Pickup';
    if (rawAddress) {
      if (typeof rawAddress === 'object') {
        address = (rawAddress as any).raw || (rawAddress as any).full_address || JSON.stringify(rawAddress);
      } else {
        address = String(rawAddress);
      }
    }

    const msg = `🔔 *New Order #${order.order_number}*\n👤 ${customerName} (${order.customer_phone})\n📋 Items:\n${itemList}\n💰 ₹${totalRupees} · ${payment}\n📍 ${address}`;

    // Send WhatsApp (best-effort, may fail outside 24h window)
    if (hasWhatsApp) {
      sendWhatsAppWithButtons(
        rest.whatsapp_phone_id!,
        rest.whatsapp_access_token!,
        rest.owner_whatsapp!,
        msg,
        'pending'
      ).catch(e => console.warn('[OwnerNotify] WhatsApp failed (24h window?):', e));
    }

    // Send Email (always reliable)
    if (hasEmail && rest.notify_new_order !== false) {
      sendNewOrderEmail({
        restaurantName: rest.name || 'Restaurant',
        ownerEmail: rest.notification_email!,
        orderNumber: (order.order_number as string) || orderId,
        customerName,
        customerPhone: order.customer_phone as string,
        items,
        total: order.total as number,
        paymentMethod: payment,
        deliveryAddress: address,
        orderId,
      }).catch(async (e) => {
        console.error('[OwnerNotify] Email failed:', e);
        // Log failure to database so the owner can debug env vars easily
        void supabaseAdmin
          .from('activity_log')
          .insert({
            restaurant_id: restaurantId,
            actor_type: 'system',
            action: 'email.failed',
            details: {
              error: e instanceof Error ? e.message : String(e),
              recipient: rest.notification_email,
              order_number: order.order_number,
              order_id: orderId,
            },
          })
          .then(({ error }) => {
            if (error) console.error('[OwnerNotify] Failed to write failure log:', error.message);
          });
      });
    }
  } catch (e) {
    console.error('[OwnerNotify] Error notifying owner:', e);
  }
}

// ─── Handle Owner Reply ─────────────────────

export async function handleOwnerReply(
  phoneNumberId: string,
  from: string,
  text: string
): Promise<boolean> {
  try {
    // Check if this sender is a restaurant owner
    const { data: restaurants } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, owner_whatsapp, whatsapp_phone_id, whatsapp_access_token')
      .eq('whatsapp_phone_id', phoneNumberId);

    if (!restaurants || restaurants.length === 0) return false;

    // Match by comparing sanitized WhatsApp numbers
    const restaurant = restaurants.find(
      (r) => r.owner_whatsapp && sanitizeWhatsAppNumber(r.owner_whatsapp) === sanitizeWhatsAppNumber(from)
    );

    if (!restaurant) return false;

    const cmd = text.toLowerCase().trim();

    // Find the most recent actionable order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_phone, status, total, items, customers(saved_name, whatsapp_name, email)')
      .eq('restaurant_id', restaurant.id)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!order) {
      if (restaurant.whatsapp_phone_id && restaurant.whatsapp_access_token) {
        await sendWhatsApp(restaurant.whatsapp_phone_id, restaurant.whatsapp_access_token, from,
          '📭 No active orders right now.');
      }
      return true;
    }

    let newStatus: string | null = null;
    let customerMsg = '';
    let ownerConfirm = '';
    const orderNum = (order.order_number as string) || order.id;

    switch (cmd) {
      case '1':
      case 'accept':
      case 'confirm':
        newStatus = 'confirmed';
        customerMsg = `✅ *Order #${orderNum} confirmed!*\nWe're getting it ready for you. 👨‍🍳`;
        ownerConfirm = `✅ Order #${orderNum} accepted.`;
        break;

      case '2':
      case 'reject':
      case 'cancel':
        newStatus = 'cancelled';
        customerMsg = `❌ *Sorry, order #${orderNum} was cancelled.*\nPlease try again later or contact us.`;
        ownerConfirm = `❌ Order #${orderNum} cancelled.`;
        break;

      case 'preparing':
      case 'prep':
        newStatus = 'preparing';
        customerMsg = `👨‍🍳 *Order #${orderNum} is being prepared!*\nHang tight, almost ready.`;
        ownerConfirm = `👨‍🍳 Order #${orderNum} marked as preparing.`;
        break;

      case 'ready':
        newStatus = 'ready';
        customerMsg = `📦 *Order #${orderNum} is ready!*\nPickup/delivery coming soon 🎉`;
        ownerConfirm = `📦 Order #${orderNum} marked as ready.`;
        break;

      case 'out':
      case 'otw':
      case 'out for delivery':
        newStatus = 'out_for_delivery';
        customerMsg = `🚗 *Order #${orderNum} is on its way!*\nAlmost there.`;
        ownerConfirm = `🚗 Order #${orderNum} is out for delivery.`;
        break;

      case 'done':
      case 'delivered':
        newStatus = 'delivered';
        customerMsg = `🎉 *Order #${orderNum} delivered!*\nEnjoy your meal from *${restaurant.name}*! 🌿`;
        ownerConfirm = `🎉 Order #${orderNum} marked as delivered.`;
        break;

      case 'status':
      case 'orders':
        // Show active orders summary
        const { data: activeOrders } = await supabaseAdmin
          .from('orders')
          .select('order_number, status, total, customer_phone')
          .eq('restaurant_id', restaurant.id)
          .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (!activeOrders || activeOrders.length === 0) {
          await sendWhatsApp(restaurant.whatsapp_phone_id!, restaurant.whatsapp_access_token!, from,
            '📭 No active orders right now.');
        } else {
          const orderList = activeOrders.map((o: any) =>
            `#${o.order_number} · ${o.status} · ₹${((o.total || 0) / 100).toFixed(0)}`
          ).join('\n');
          await sendWhatsApp(restaurant.whatsapp_phone_id!, restaurant.whatsapp_access_token!, from,
            `📋 *Active Orders:*\n${orderList}\n\nReply with: *1* accept · *preparing* · *ready* · *done*`);
        }
        return true;

      default:
        // Not a recognized command
        return true;
    }

    if (newStatus) {
      // Update order status
      const updates: Record<string, unknown> = { status: newStatus };
      const tsField = `${newStatus === 'out_for_delivery' ? 'out_for_delivery' : newStatus}_at`;
      if (newStatus !== 'out_for_delivery') {
        updates[`${newStatus}_at`] = new Date().toISOString();
      }

      await supabaseAdmin
        .from('orders')
        .update(updates)
        .eq('id', order.id);

      // Notify customer
      if (order.customer_phone && restaurant.whatsapp_phone_id && restaurant.whatsapp_access_token) {
        await sendWhatsApp(restaurant.whatsapp_phone_id, restaurant.whatsapp_access_token,
          order.customer_phone as string, customerMsg);
      }

      // Confirm to owner
      if (restaurant.whatsapp_phone_id && restaurant.whatsapp_access_token) {
        await sendWhatsAppWithButtons(
          restaurant.whatsapp_phone_id,
          restaurant.whatsapp_access_token,
          from,
          ownerConfirm,
          newStatus as any
        );
      }

      // On delivery: send receipt + feedback sequentially with 7 seconds delay
      if (newStatus === 'delivered') {
        try {
          const { sendOrderReceipt, sendFeedbackRequest } = await import('@/lib/ai/orchestrator');
          const { getRestaurantById } = await import('@/lib/services/restaurant-service');
          const fullRestaurant = await getRestaurantById(restaurant.id);
          if (fullRestaurant) {
            // Await receipt sending
            await sendOrderReceipt(fullRestaurant, order.id, order.customer_phone as string)
              .catch(e => console.error('[OwnerNotif] Receipt failed:', e));

            // Wait 7 seconds before triggering feedback to ensure proper order on WhatsApp
            await new Promise(resolve => setTimeout(resolve, 7000));

            // Await feedback request
            await sendFeedbackRequest(fullRestaurant, order.id, order.customer_phone as string)
              .catch(e => console.error('[OwnerNotif] Feedback request failed:', e));
          }
        } catch { /* silent */ }
      }

      // If customer has email, send email notification
      const customer = order.customers as any;
      if (customer?.email) {
        sendOrderStatusEmail({
          customerEmail: customer.email,
          customerName: customer.saved_name || customer.whatsapp_name || 'Valued Customer',
          orderNumber: order.order_number || order.id,
          restaurantName: restaurant.name || 'AssistMint Partner',
          status: newStatus,
          total: order.total || 0,
          items: (order.items as any) || [],
        }).catch(e => console.error('[OwnerNotif] Email status notification failed:', e));
      }
    }

    return true;
  } catch (e) {
    console.error('[OwnerNotify] Error handling owner reply:', e);
    return false;
  }
}

// ─── Daily Summary ──────────────────────────

export async function sendDailySummary(restaurantId: string): Promise<void> {
  try {
    const { data: rest } = await supabaseAdmin
      .from('restaurants')
      .select('name, owner_whatsapp, whatsapp_phone_id, whatsapp_access_token, notification_email, notify_daily_summary')
      .eq('id', restaurantId)
      .single();

    if (!rest) return;
    const hasWhatsApp = rest.owner_whatsapp && rest.whatsapp_phone_id && rest.whatsapp_access_token;
    const hasEmail = rest.notification_email;
    if (!hasWhatsApp && !hasEmail) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Count orders today
    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', todayISO);

    const { count: deliveredOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'delivered')
      .gte('created_at', todayISO);

    const { count: cancelledOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'cancelled')
      .gte('created_at', todayISO);

    // Revenue
    const { data: revenueData } = await supabaseAdmin
      .from('orders')
      .select('total')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'delivered')
      .gte('created_at', todayISO);

    const revenue = (revenueData || []).reduce((sum, o: any) => sum + (o.total || 0), 0);
    const revenueRupees = (revenue / 100).toFixed(0);

    // Unique customers
    const { data: customerData } = await supabaseAdmin
      .from('orders')
      .select('customer_phone')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', todayISO);

    const uniqueCustomers = new Set((customerData || []).map((o: any) => o.customer_phone)).size;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const msg = `📊 *Daily Summary — ${rest.name}*\n📅 ${dateStr}\n\n📦 Orders: ${totalOrders || 0}\n✅ Delivered: ${deliveredOrders || 0}\n❌ Cancelled: ${cancelledOrders || 0}\n💰 Revenue: ₹${revenueRupees}\n👥 Customers: ${uniqueCustomers}\n\nGreat work today! 🌟`;

    // WhatsApp summary (best-effort)
    if (hasWhatsApp) {
      sendWhatsApp(rest.whatsapp_phone_id!, rest.whatsapp_access_token!, rest.owner_whatsapp!, msg)
        .catch(e => console.warn('[OwnerNotify] WhatsApp daily summary failed:', e));
    }

    // Email summary (always reliable)
    if (hasEmail && rest.notify_daily_summary !== false) {
      sendDailySummaryEmail({
        restaurantName: rest.name || 'Restaurant',
        ownerEmail: rest.notification_email!,
        date: dateStr,
        totalOrders: totalOrders || 0,
        deliveredOrders: deliveredOrders || 0,
        cancelledOrders: cancelledOrders || 0,
        revenue,
        uniqueCustomers,
      }).catch(async (e) => {
        console.error('[OwnerNotify] Email daily summary failed:', e);
        void supabaseAdmin
          .from('activity_log')
          .insert({
            restaurant_id: restaurantId,
            actor_type: 'system',
            action: 'email.failed',
            details: {
              error: e instanceof Error ? e.message : String(e),
              recipient: rest.notification_email,
              type: 'daily_summary',
            },
          })
          .then(({ error }) => {
            if (error) console.error('[OwnerNotify] Failed to write daily summary failure log:', error.message);
          });
      });
    }
  } catch (e) {
    console.error('[OwnerNotify] Error sending daily summary:', e);
  }
}
