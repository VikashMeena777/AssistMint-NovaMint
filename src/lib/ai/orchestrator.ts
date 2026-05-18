// ============================================
// AssistMint — AI Ordering Orchestrator
// The brain: Routes WhatsApp messages through
// AI engine with menu context + cart tools
// ============================================

import { generateAIResponse } from '@/lib/ai/engine';
import { getFullMenu, buildMenuContext, getMenuItemById, searchMenuItems } from '@/lib/services/menu-service';
import { getOrCreateCart, addToCart, removeFromCart, clearCart, formatCartForWhatsApp, convertCartToOrder, updateCartItemQuantity, type CartItem } from '@/lib/services/cart-engine';
import { getOrCreateCustomer, updateCustomerOrderStats, getSavedAddresses, addSavedAddress, getCustomerOrders, saveOrderRating, updateCustomerPreferences, setCustomerLanguage } from '@/lib/services/customer-service';
import { getOrCreateConversation, getRecentMessages, saveMessage, setBotActive } from '@/lib/services/conversation-manager';
import { getRestaurantByPhoneId, type Restaurant } from '@/lib/services/restaurant-service';
import { createBotPaymentLink } from '@/lib/services/bot-payment';
import { sendTextMessage, sendReplyButtons, sendListMessage, sendImageMessage, sendDocumentMessage, type ListSection } from '@/lib/whatsapp/client';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Main Orchestrator ──────────────────────

export async function handleIncomingMessage(params: {
  phoneNumberId: string;
  from: string;           // customer phone
  messageId: string;
  text?: string;
  interactiveReply?: {
    type: string;
    id: string;
    title: string;
  };
  whatsappName?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}): Promise<void> {
  const { phoneNumberId, from, messageId, text, interactiveReply, whatsappName, location } = params;

  // 1. Lookup restaurant by WhatsApp phone ID
  const restaurant = await getRestaurantByPhoneId(phoneNumberId);
  if (!restaurant) {
    console.error(`[Orchestrator] No restaurant found for phone_id=${phoneNumberId}`);
    return;
  }

  // 2. Get or create customer
  const customer = await getOrCreateCustomer(restaurant.id, from, whatsappName);

  if (customer.is_blocked) {
    console.log(`[Orchestrator] Blocked customer ${from} tried to message`);
    return;
  }

  // 3. Get or create conversation
  const conversation = await getOrCreateConversation(restaurant.id, customer.id, from);

  // Save incoming message
  const incomingText = text || interactiveReply?.title || (location ? `📍 Location: ${location.latitude},${location.longitude}` : '(non-text)');
  await saveMessage(conversation.id, restaurant.id, 'customer', incomingText, messageId, { phone: from });

  // 4. Check if bot is active (might be in human handoff mode)
  if (!conversation.is_bot_active) {
    console.log(`[Orchestrator] Bot inactive for conversation ${conversation.id}, skipping`);
    return; // Human agent is handling
  }

  // 5. Handle location messages — use as delivery address
  if (location) {
    await handleLocationMessage(restaurant, customer, conversation, location);
    return;
  }

  // 6. Handle interactive button/list replies by ID
  if (interactiveReply) {
    await handleInteractiveReply(restaurant, customer, conversation, interactiveReply);
    return;
  }

  // 7. Handle special commands
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey' || lowerText === 'start') {
    await sendGreeting(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'menu' || lowerText === 'browse') {
    await sendMenuOverview(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'cart' || lowerText === 'my cart') {
    await sendCartSummary(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'checkout' || lowerText === 'order' || lowerText === 'place order') {
    await askForDeliveryAddress(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'agent' || lowerText === 'human' || lowerText === 'help') {
    await handleHumanHandoff(restaurant, customer, conversation);
    return;
  }
  // ── New Commands ──
  if (lowerText.startsWith('search ') || lowerText.startsWith('find ')) {
    const query = (text || '').replace(/^(search|find)\s+/i, '').trim();
    await sendSearchResults(restaurant, customer, conversation, query);
    return;
  }
  if (lowerText === 'orders' || lowerText === 'my orders' || lowerText === 'order history') {
    await sendOrderHistory(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'reorder' || lowerText === 'repeat' || lowerText === 'repeat order') {
    await handleReorder(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'veg' || lowerText === 'veg menu' || lowerText === 'vegetarian') {
    await sendMenuOverview(restaurant, customer, conversation, 'veg');
    return;
  }
  if (lowerText === 'nonveg' || lowerText === 'non-veg' || lowerText === 'non veg') {
    await sendMenuOverview(restaurant, customer, conversation, 'nonveg');
    return;
  }
  if (lowerText === 'bestsellers' || lowerText === 'popular' || lowerText === 'best') {
    await sendMenuOverview(restaurant, customer, conversation, 'bestseller');
    return;
  }
  if (lowerText === 'hindi' || lowerText === 'हिंदी') {
    await setCustomerLanguage(customer.id, 'hi');
    customer.language_preference = 'hi';
    await sendBotReply(restaurant, customer, conversation, '✅ भाषा हिंदी में बदल दी गई है! 🇮🇳\n\nअब मैं आपसे हिंदी में बात करूँगा। मेनू देखने के लिए *menu* भेजें।');
    return;
  }
  if (lowerText === 'english') {
    await setCustomerLanguage(customer.id, 'en');
    customer.language_preference = 'en';
    await sendBotReply(restaurant, customer, conversation, '✅ Language switched to English! 🇬🇧\n\nSend *menu* to browse our menu.');
    return;
  }

  // 6.5 Check if bot asked for delivery address — treat this text as the address
  const recentMsgs = await getRecentMessages(conversation.id);
  const lastBotMsg = [...recentMsgs].reverse().find((m) => m.role === 'assistant');
  if (lastBotMsg && lastBotMsg.content.includes('delivery address')) {
    // User replied with their address — save and proceed to payment
    const address = text || '';
    await addSavedAddress(customer.id, address);
    await sendBotReply(restaurant, customer, conversation, `📍 *Delivery Address saved:*\n${address}\n\nProceeding to payment...`);
    // Store address in conversation metadata for order creation
    const cart = await getOrCreateCart(restaurant.id, customer.id);
    if (cart.items.length > 0) {
      // Update cart metadata with address
      const { createClient: createAdmin } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      await supabaseAdmin
        .from('cart_sessions')
        .update({ metadata: { delivery_address: address } })
        .eq('id', cart.id);
    }
    await sendPaymentChoice(restaurant, customer, conversation);
    return;
  }

  // 7. AI-powered response
  await generateAndSendAIResponse(restaurant, customer, conversation, text || '');
}

// ─── Location Message Handler ───────────────

async function handleLocationMessage(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string },
  location: { latitude: number; longitude: number; name?: string; address?: string }
): Promise<void> {
  // Build address string from location data
  let addressStr = '';
  if (location.address) {
    addressStr = location.address;
  } else if (location.name) {
    addressStr = `${location.name} (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`;
  } else {
    addressStr = `📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  // Try reverse geocoding via free Nominatim API (OpenStreetMap)
  if (!location.address) {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'AssistMint/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json() as Record<string, unknown>;
        if (geoData.display_name) {
          addressStr = geoData.display_name as string;
        }
      }
    } catch {
      // Geocoding failed — use coordinates
      console.warn('[Orchestrator] Reverse geocoding failed, using coordinates');
    }
  }

  // Save address to customer's saved addresses
  await addSavedAddress(customer.id, addressStr);

  // Save to cart session metadata
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length > 0) {
    const { createClient: createAdmin } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    await supabaseAdmin
      .from('cart_sessions')
      .update({ metadata: { delivery_address: addressStr, location: { lat: location.latitude, lng: location.longitude } } })
      .eq('id', cart.id);

    // Confirm and proceed to payment
    await sendBotReply(restaurant, customer, conversation,
      `📍 *Delivery Location Set!*\n\n${addressStr}\n\n${formatCartForWhatsApp(cart)}`
    );

    // Show payment options
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id!,
      accessToken: restaurant.whatsapp_token!,
      to: customer.phone,
      bodyText: 'How would you like to pay?',
      buttons: [
        { id: 'btn_cod', title: '💵 Cash on Delivery' },
        { id: 'btn_online_pay', title: '💳 Pay Online' },
      ],
    });
  } else {
    // No items in cart — just save the address
    await sendBotReply(restaurant, customer, conversation,
      `📍 *Location saved!*\n\n${addressStr}\n\nYour address has been saved for future orders. Browse our menu to start ordering! 🍽️`
    );
  }
}

// ─── Interactive Reply Router ───────────────

async function handleInteractiveReply(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; loyalty_tier: string; total_orders: number },
  conversation: { id: string; context: Record<string, unknown> },
  reply: { type: string; id: string; title: string }
): Promise<void> {
  const btnId = reply.id;

  switch (btnId) {
    case 'btn_menu':
      await sendMenuOverview(restaurant, customer, conversation);
      break;

    case 'btn_cart':
      await sendCartSummary(restaurant, customer, conversation);
      break;

    case 'btn_help':
      await generateAndSendAIResponse(restaurant, customer, conversation, 'I need help with ordering');
      break;

    case 'btn_place_order':
      await askForDeliveryAddress(restaurant, customer, conversation);
      break;

    case 'btn_clear_cart':
      await clearCart((await getOrCreateCart(restaurant.id, customer.id)).id);
      await sendBotReply(restaurant, customer, conversation, '🗑 Cart cleared! Browse the menu to add new items.');
      break;

    case 'btn_cod':
      await handleCODOrder(restaurant, customer, conversation);
      break;

    case 'btn_online_pay':
      await handleOnlinePayOrder(restaurant, customer, conversation);
      break;

    case 'btn_skip_address':
      await sendPaymentChoice(restaurant, customer, conversation);
      break;

    case 'btn_reorder':
      await handleReorder(restaurant, customer, conversation);
      break;

    case 'btn_orders':
      await sendOrderHistory(restaurant, customer, conversation);
      break;

    case 'btn_veg_menu':
      await sendMenuOverview(restaurant, customer, conversation, 'veg');
      break;

    case 'btn_nonveg_menu':
      await sendMenuOverview(restaurant, customer, conversation, 'nonveg');
      break;

    case 'btn_location':
      await sendBotReply(restaurant, customer, conversation, '📍 Please share your *live location* by tapping the 📎 attachment icon → Location → Share Live Location.\n\nThis helps us deliver your order faster!');
      break;

    default:
      // Handle dynamic IDs: item_uuid, add_uuid, inc_uuid, dec_uuid, rate_N_uuid, addr_N
      if (btnId.startsWith('item_')) {
        await sendItemDetails(restaurant, customer, conversation, btnId.replace('item_', ''));
      } else if (btnId.startsWith('add_')) {
        await handleDirectAddToCart(restaurant, customer, conversation, btnId.replace('add_', ''));
      } else if (btnId.startsWith('inc_')) {
        await handleCartIncrement(restaurant, customer, conversation, btnId.replace('inc_', ''));
      } else if (btnId.startsWith('dec_')) {
        await handleCartDecrement(restaurant, customer, conversation, btnId.replace('dec_', ''));
      } else if (btnId.startsWith('rate_')) {
        // rate_3_orderId
        const parts = btnId.replace('rate_', '').split('_');
        const rating = parseInt(parts[0]);
        const orderId = parts.slice(1).join('_');
        await saveOrderRating(orderId, rating);
        const ratingMsg = rating >= 4 ? '🎉 Thank you for the amazing rating!' : '🙏 Thank you for your feedback. We\'ll work to improve!';
        await sendBotReply(restaurant, customer, conversation, `${ratingMsg}\n\n⭐ You rated: ${rating}/5`);
      } else if (btnId.startsWith('addr_')) {
        const idx = parseInt(btnId.replace('addr_', ''));
        const addresses = await getSavedAddresses(customer.id);
        if (addresses[idx]) {
          await sendBotReply(restaurant, customer, conversation, `📍 *Delivery Address:*\n${addresses[idx]}\n\nProceeding to payment...`);
          const cart = await getOrCreateCart(restaurant.id, customer.id);
          if (cart.items.length > 0) {
            const { createClient: createAdmin } = await import('@supabase/supabase-js');
            const supabaseAdmin = createAdmin(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              { auth: { persistSession: false } }
            );
            await supabaseAdmin.from('cart_sessions').update({ metadata: { delivery_address: addresses[idx] } }).eq('id', cart.id);
          }
          await sendPaymentChoice(restaurant, customer, conversation);
        }
      } else {
        await generateAndSendAIResponse(restaurant, customer, conversation, reply.title);
      }
      break;
  }
}

// ─── Item Details with Add Button ───────────

async function sendItemDetails(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  itemId: string
): Promise<void> {
  const item = await getMenuItemById(itemId);
  if (!item) {
    await sendBotReply(restaurant, customer, conversation, '❌ Sorry, this item is no longer available.');
    return;
  }

  const priceRupees = (item.price / 100).toFixed(0);
  const veg = item.is_veg ? '🟢 Veg' : '🔴 Non-Veg';
  const star = item.is_bestseller ? ' ⭐ Bestseller' : '';
  const desc = item.description ? `\n\n${item.description}` : '';

  const bodyText = `*${item.name}*${star}\n${veg} · ₹${priceRupees}${desc}\n\n⏱ Ready in ~${item.prep_time_minutes} mins`;

  // Send image first if available
  if (item.image_url && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    try {
      await sendImageMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        imageUrl: item.image_url,
        caption: `${item.name} — ₹${priceRupees} ${veg}${star}`,
      });
    } catch (e) {
      console.warn('[Orchestrator] Image send failed:', e);
    }
  }

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: `add_${itemId}`, title: `🛒 Add to Cart` },
        { id: 'btn_menu', title: '📋 Back to Menu' },
      ],
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Direct Add to Cart ─────────────────────

async function handleDirectAddToCart(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  itemId: string
): Promise<void> {
  const item = await getMenuItemById(itemId);
  if (!item) {
    await sendBotReply(restaurant, customer, conversation, '❌ Sorry, this item is unavailable.');
    return;
  }

  const cart = await getOrCreateCart(restaurant.id, customer.id);
  const cartItem: CartItem = {
    item_id: item.id,
    item_name: item.name,
    quantity: 1,
    unit_price: item.price,
  };
  const updatedCart = await addToCart(cart.id, cartItem);

  const priceRupees = (item.price / 100).toFixed(0);
  const itemCount = updatedCart.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalRupees = (updatedCart.total / 100).toFixed(0);

  const bodyText = `✅ *Added to cart!*\n\n${item.name} — ₹${priceRupees}\n\n🛒 Cart: ${itemCount} item${itemCount > 1 ? 's' : ''} · ₹${totalRupees}`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_menu', title: '📋 Add More' },
        { id: 'btn_cart', title: '🛒 View Cart' },
        { id: 'btn_place_order', title: '✅ Checkout' },
      ],
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Greeting with Buttons ──────────────────

async function sendGreeting(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; total_orders?: number; language_preference?: string },
  conversation: { id: string }
): Promise<void> {
  const isHindi = customer.language_preference === 'hi';
  const isReturning = (customer.total_orders || 0) > 0;
  
  let bodyText: string;
  if (isHindi) {
    const greeting = customer.name ? `नमस्ते ${customer.name}! 👋` : 'नमस्ते! 👋';
    bodyText = `${greeting}\n\n*${restaurant.name}* में आपका स्वागत है! 🌿\n\nमैं आपका AI असिस्टेंट हूँ — मेनू देखने, ऑर्डर करने, और बहुत कुछ में मदद कर सकता हूँ!\n\nआप क्या करना चाहेंगे?`;
  } else {
    const greeting = customer.name ? `Hi ${customer.name}! 👋` : 'Hi there! 👋';
    bodyText = `${greeting}\n\nWelcome${isReturning ? ' back' : ''} to *${restaurant.name}*! 🌿\n\nI'm your AI assistant — I can help you browse our menu, take your order, and more!\n\nWhat would you like to do?`;
  }

  const buttons = isReturning
    ? [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_reorder', title: '🔄 Reorder Last' },
        { id: 'btn_orders', title: '📦 My Orders' },
      ]
    : [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_cart', title: '🛒 My Cart' },
        { id: 'btn_help', title: '💬 Help' },
      ];

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons,
    });
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Menu Overview (Interactive List) ───────

async function sendMenuOverview(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; language_preference?: string },
  conversation: { id: string },
  dietaryFilter?: 'veg' | 'nonveg' | 'bestseller'
): Promise<void> {
  const menu = await getFullMenu(restaurant.id);

  if (!menu || menu.categories.length === 0) {
    await sendBotReply(restaurant, customer, conversation,
      `Welcome to ${restaurant.name}! 🌿\n\nOur menu is being set up. Please check back soon!`);
    return;
  }

  // Apply dietary filter
  const filteredMenu = {
    ...menu,
    categories: menu.categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (dietaryFilter === 'veg') return item.is_veg;
        if (dietaryFilter === 'nonveg') return !item.is_veg;
        if (dietaryFilter === 'bestseller') return item.is_bestseller;
        return true;
      }),
    })).filter(cat => cat.items.length > 0),
  };

  if (filteredMenu.categories.length === 0) {
    const filterName = dietaryFilter === 'veg' ? 'vegetarian' : dietaryFilter === 'nonveg' ? 'non-veg' : 'bestseller';
    await sendBotReply(restaurant, customer, conversation, `No ${filterName} items found. Send *menu* to see the full menu.`);
    return;
  }

  // Build interactive list sections from menu categories
  const sections: ListSection[] = filteredMenu.categories.slice(0, 10).map((cat) => ({
    title: cat.name.substring(0, 24),
    rows: cat.items.slice(0, 10).map((item) => ({
      id: `item_${item.id}`,
      title: item.name.substring(0, 24),
      description: `₹${(item.price / 100).toFixed(0)}${item.is_veg ? ' 🟢' : ' 🔴'}${item.is_bestseller ? ' ⭐' : ''}`,
    })),
  }));

  const filterLabel = dietaryFilter === 'veg' ? ' (🟢 Veg Only)' : dietaryFilter === 'nonveg' ? ' (🔴 Non-Veg)' : dietaryFilter === 'bestseller' ? ' (⭐ Bestsellers)' : '';
  const isHindi = customer.language_preference === 'hi';
  const bodyText = isHindi
    ? `हमारा मेनू देखें${filterLabel}! 🍽️\n\nआइटम चुनें और ऑर्डर करें।\n\n📝 सर्च करें: *search पनीर* भेजें\n🟢 वेज: *veg* | 🔴 नॉन-वेज: *nonveg*`
    : `Here's our menu${filterLabel}! 🍽️\n\nTap below to browse and order.\n\n📝 Search: *search paneer*\n🟢 Veg only: *veg* | 🔴 Non-veg: *nonveg*\n⭐ Popular: *bestsellers*`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    try {
      await sendListMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        headerText: `${restaurant.name} Menu${filterLabel}`,
        bodyText,
        footerText: 'Tap an item to see details & image',
        buttonText: '📋 Browse Menu',
        sections,
      });
    } catch (e) {
      // Fallback to text if list message fails
      console.warn('[Orchestrator] List message failed, falling back to text:', e);
      const textMenu = filteredMenu.categories
        .map((c) => `📂 *${c.name}*\n${c.items.map((i) => `  • ${i.name} — ₹${(i.price / 100).toFixed(0)}${i.is_veg ? ' 🟢' : ' 🔴'}${i.is_bestseller ? ' ⭐' : ''}`).join('\n')}`)
        .join('\n\n');

      await sendBotReply(restaurant, customer, conversation,
        `Here's our menu${filterLabel}! 🍽️\n\n${textMenu}\n\nJust tell me what you'd like to order!`);
      return;
    }
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Cart Summary with Buttons ──────────────

async function sendCartSummary(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);

  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty!\n\nBrowse the menu to add delicious items.');
    return;
  }

  // Build rich itemized cart
  const itemLines = cart.items.map((i, idx) => {
    const total = ((i.unit_price * i.quantity) / 100).toFixed(0);
    return `${idx + 1}. ${i.item_name} × ${i.quantity} — ₹${total}`;
  }).join('\n');

  const subtotalR = (cart.subtotal / 100).toFixed(0);
  const deliveryR = (cart.delivery_fee / 100).toFixed(0);
  const taxR = (cart.tax / 100).toFixed(0);
  const totalR = (cart.total / 100).toFixed(0);

  const cartText = `🛒 *Your Cart*\n\n${itemLines}\n\n━━━━━━━━━━━━━━━━\n📦 Subtotal: ₹${subtotalR}\n🚗 Delivery: ₹${deliveryR}\n📋 Tax: ₹${taxR}\n━━━━━━━━━━━━━━━━\n💰 *Total: ₹${totalR}*`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Build list sections for editing cart
    const editRows = cart.items.flatMap((i) => [
      { id: `inc_${i.item_id}`, title: `➕ Add 1 ${i.item_name.substring(0, 18)}`, description: `Current: ${i.quantity}` },
      { id: `dec_${i.item_id}`, title: `➖ Remove 1 ${i.item_name.substring(0, 15)}`, description: i.quantity === 1 ? 'Removes from cart' : `Current: ${i.quantity}` },
    ]);

    const sections: ListSection[] = [
      { title: '📝 Edit Items', rows: editRows.slice(0, 8) },
      { title: '⚡ Actions', rows: [
        { id: 'btn_place_order', title: '✅ Place Order', description: `Total: ₹${totalR}` },
        { id: 'btn_clear_cart', title: '🗑 Clear Cart', description: 'Remove all items' },
        { id: 'btn_menu', title: '📋 Add More Items', description: 'Browse menu' },
      ]},
    ];

    await sendListMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      headerText: '🛒 Your Cart',
      bodyText: cartText,
      buttonText: '📝 Edit / Checkout',
      sections,
    });
    await saveMessage(conversation.id, restaurant.id, 'bot', cartText, undefined, { phone: customer.phone });
  } else {
    await sendBotReply(restaurant, customer, conversation, cartText);
  }
}

// ─── Delivery Address Collection ────────────

async function askForDeliveryAddress(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty!');
    return;
  }

  // Check for saved addresses
  const savedAddrs = await getSavedAddresses(customer.id);

  if (savedAddrs.length > 0 && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Offer saved addresses via list
    const addrRows = savedAddrs.slice(0, 3).map((addr, i) => ({
      id: `addr_${i}`,
      title: addr.substring(0, 24),
      description: addr.substring(0, 72),
    }));
    const sections: ListSection[] = [
      { title: '📍 Saved Addresses', rows: addrRows },
      { title: '⚙️ Options', rows: [
        { id: 'btn_skip_address', title: '🏪 Pickup Instead', description: 'Pick up from restaurant' },
      ]},
    ];
    await sendListMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      headerText: 'Delivery Address',
      bodyText: '📍 *Where should we deliver?*\n\nSelect a saved address, or type a new one below.',
      buttonText: '📍 Choose Address',
      sections,
    });
    await saveMessage(conversation.id, restaurant.id, 'bot', 'Choose delivery address or type new one', undefined, { phone: customer.phone });
  } else {
    const bodyText = '📍 *Where should we deliver your order?*\n\nPlease type your full delivery address below, or choose pickup.';
    if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
      await sendReplyButtons({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        bodyText,
        buttons: [
          { id: 'btn_skip_address', title: '🏪 Pickup Instead' },
          { id: 'btn_location', title: '📍 Share Location' },
        ],
      });
    }
    await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
  }
}

// ─── Cart Increment/Decrement ───────────────

async function handleCartIncrement(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  itemId: string
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  const item = cart.items.find((i) => i.item_id === itemId);
  if (!item) {
    await sendBotReply(restaurant, customer, conversation, '❌ Item not found in cart.');
    return;
  }
  await updateCartItemQuantity(cart.id, itemId, item.quantity + 1);
  await sendBotReply(restaurant, customer, conversation, `➕ *${item.item_name}* quantity updated to ${item.quantity + 1}`);
  await sendCartSummary(restaurant, customer, conversation);
}

async function handleCartDecrement(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  itemId: string
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  const item = cart.items.find((i) => i.item_id === itemId);
  if (!item) {
    await sendBotReply(restaurant, customer, conversation, '❌ Item not found in cart.');
    return;
  }
  if (item.quantity <= 1) {
    await removeFromCart(cart.id, itemId);
    await sendBotReply(restaurant, customer, conversation, `🗑 *${item.item_name}* removed from cart.`);
  } else {
    await updateCartItemQuantity(cart.id, itemId, item.quantity - 1);
    await sendBotReply(restaurant, customer, conversation, `➖ *${item.item_name}* quantity updated to ${item.quantity - 1}`);
  }
  await sendCartSummary(restaurant, customer, conversation);
}

// ─── Payment Choice ─────────────────────────

async function sendPaymentChoice(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);

  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation,
      '🛒 Your cart is empty! Browse the menu to add items first.');
    return;
  }

  const subtotalRupees = (cart.subtotal / 100).toFixed(0);
  const deliveryRupees = (cart.delivery_fee / 100).toFixed(0);
  const taxRupees = (cart.tax / 100).toFixed(0);
  const totalRupees = (cart.total / 100).toFixed(0);

  // Build premium itemized receipt
  const itemLines = cart.items.map((i) => {
    const itemTotal = ((i.unit_price * i.quantity) / 100).toFixed(0);
    return `• ${i.item_name} × ${i.quantity} — ₹${itemTotal}`;
  }).join('\n');

  const bodyText = `🧾 *Order Summary*\n\n${itemLines}\n\n━━━━━━━━━━━━━━━━\n📦 Subtotal: ₹${subtotalRupees}\n🚗 Delivery: ₹${deliveryRupees}\n📋 Tax (5%): ₹${taxRupees}\n━━━━━━━━━━━━━━━━\n💰 *Total: ₹${totalRupees}*\n\nHow would you like to pay?`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_cod', title: '💵 Cash on Delivery' },
        { id: 'btn_online_pay', title: '💳 Pay Online' },
      ],
    });
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── COD Order ──────────────────────────────

async function handleCODOrder(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty!');
    return;
  }

  const orderId = await convertCartToOrder(cart, 'delivery', undefined, undefined, 'cod');
  await updateCustomerOrderStats(customer.id, cart.total);

  const totalRupees = (cart.total / 100).toFixed(0);
  const estimatedTime = getEstimatedDeliveryTime(cart.items.length, 'delivery');
  const reply = `🎉 *Order Placed!*\n\n💵 Payment: Cash on Delivery\n💰 Amount: ₹${totalRupees}\n⏱️ Estimated: *${estimatedTime}*\n\nYour order is being prepared! You'll pay ₹${totalRupees} when it arrives.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;

  await sendBotReply(restaurant, customer, conversation, reply);

  // Send receipt PDF (non-blocking)
  if (orderId) {
    sendOrderReceipt(restaurant, orderId, customer.phone).catch(() => {});
  }

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'customer',
    actorId: customer.id,
    action: ACTIONS.ORDER_PLACED,
    details: { orderId, totalAmount: cart.total, paymentMethod: 'cod', estimatedTime },
  });
}

// ─── Online Payment Order ───────────────────

async function handleOnlinePayOrder(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty!');
    return;
  }

  const orderId = await convertCartToOrder(cart, 'delivery', undefined, undefined, 'online');
  await updateCustomerOrderStats(customer.id, cart.total);

  const totalRupees = (cart.total / 100).toFixed(0);
  const estimatedTime = getEstimatedDeliveryTime(cart.items.length, 'delivery');

  // Generate Cashfree payment link
  const paymentLink = await createBotPaymentLink(
    restaurant.id,
    orderId,
    customer.phone,
    customer.name || 'Customer',
    cart.total
  );

  let reply: string;
  if (paymentLink) {
    reply = `🎉 *Order Placed!*\n\n💳 Payment: Online\n💰 Amount: ₹${totalRupees}\n⏱️ Estimated: *${estimatedTime}*\n\n👉 Pay securely here:\n${paymentLink}\n\nYour order will be confirmed once payment is received.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;
  } else {
    reply = `🎉 *Order Placed!*\n\n💰 Amount: ₹${totalRupees}\n⏱️ Estimated: *${estimatedTime}*\n\n⚠️ Online payment is being set up. Our team will contact you for payment.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;
  }

  await sendBotReply(restaurant, customer, conversation, reply);

  // Send receipt PDF (non-blocking)
  if (orderId) {
    sendOrderReceipt(restaurant, orderId, customer.phone).catch(() => {});
  }

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'customer',
    actorId: customer.id,
    action: ACTIONS.ORDER_PLACED,
    details: { orderId, totalAmount: cart.total, paymentMethod: 'online', paymentLink, estimatedTime },
  });
}

// ─── AI Response Generation ─────────────────

async function generateAndSendAIResponse(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; loyalty_tier: string; total_orders: number },
  conversation: { id: string; context: Record<string, unknown> },
  userMessage: string
): Promise<void> {
  // Load menu context
  const menu = await getFullMenu(restaurant.id);
  const menuContext = menu ? buildMenuContext(menu) : 'Menu is being set up.';

  // Load conversation history
  const history = await getRecentMessages(conversation.id, 10);

  // Load cart
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  const cartContext = formatCartForWhatsApp(cart);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(restaurant, customer, menuContext, cartContext);

  // Generate AI response
  const aiResponse = await generateAIResponse({
    systemPrompt,
    messages: [
      ...history,
      { role: 'user', content: userMessage },
    ],
    maxOutputTokens: 512,
    temperature: 0.7,
  });

  // Parse AI response for actions
  const { reply, actions } = parseAIResponse(aiResponse.text);

  // Execute actions (add to cart, etc.)
  for (const action of actions) {
    await executeAction(action, restaurant, customer, conversation, cart.id);
  }

  // Send reply via WhatsApp
  // If actions included add_to_cart, append cart buttons
  const hasCartAction = actions.some((a) => a.type === 'add_to_cart');
  const hasPlaceOrder = actions.some((a) => a.type === 'place_order');

  if (hasPlaceOrder) {
    // Order was placed via AI action — show payment choice
    await sendPaymentChoice(restaurant, customer, conversation);
    await saveMessage(conversation.id, restaurant.id, 'bot', reply, undefined, { phone: customer.phone });
  } else if (hasCartAction && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Item added — show cart buttons
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText: reply,
      buttons: [
        { id: 'btn_cart', title: '🛒 View Cart' },
        { id: 'btn_menu', title: '📋 Add More' },
        { id: 'btn_place_order', title: '✅ Checkout' },
      ],
    });
    await saveMessage(conversation.id, restaurant.id, 'bot', reply, undefined, { phone: customer.phone });
  } else {
    await sendBotReply(restaurant, customer, conversation, reply);
  }

  // Log activity (fire-and-forget)
  logActivity({
    restaurantId: restaurant.id,
    actorType: 'bot',
    action: ACTIONS.BOT_CONVERSATION,
    details: { customerPhone: customer.phone, provider: aiResponse.provider },
  });
}

// ─── Build System Prompt ────────────────────

function buildSystemPrompt(
  restaurant: Restaurant,
  customer: { name?: string; loyalty_tier: string; total_orders: number; language_preference?: string },
  menuContext: string,
  cartContext: string
): string {
  const isHindi = customer.language_preference === 'hi';
  const langInstruction = isHindi
    ? `\n\n## LANGUAGE: Respond ONLY in Hindi (Devanagari script). Use English for brand names, food names, and prices. Example: "आपके कार्ट में Paneer Tikka — ₹250 जोड़ दिया गया है!"`
    : '';

  return `${restaurant.ai_persona || ''}

You are the premium AI concierge for "${restaurant.name}" on WhatsApp. You provide a world-class ordering experience.

## YOUR PERSONALITY:
- Professional yet warm. Like a 5-star restaurant host.
- Keep responses SHORT (2-4 lines max). No walls of text.
- Use bold (*text*) for emphasis. Use emojis tastefully (1-2 per message).
- Speak naturally. Never say "I am an AI" or "as an AI assistant".
${langInstruction}

## STRICT RULES:
1. ALL prices are in ₹ (Indian Rupees). Menu prices are in paise — ALWAYS divide by 100 when showing to customer.
2. NEVER invent menu items. Only recommend what's in the MENU section below.
3. If customer asks for something not on the menu, say "That's not on our menu right now" and suggest similar items.
4. For complaints or complex issues, say: "Let me connect you with our team — just type *agent*"
5. Minimum order: ₹${(restaurant.min_order_amount / 100).toFixed(0)}
6. Keep responses conversational, not listy.

## CUSTOMER:
${customer.name ? `Name: ${customer.name}` : 'New customer'}${customer.total_orders > 0 ? ` · ${customer.total_orders} previous orders · ${customer.loyalty_tier} tier` : ''}

## CURRENT CART:
${cartContext}

## MENU:
${menuContext}

## CART ACTIONS — CRITICAL RULES:
You can include these EXACT tags in your response to modify the cart:
- [ADD_TO_CART:ITEM_ID:QUANTITY] — Use the EXACT item ID from the menu above
- [REMOVE_FROM_CART:ITEM_ID]
- [CLEAR_CART]
- [PLACE_ORDER]
- [ADD_INSTRUCTIONS:ITEM_ID:instruction text] — Add special instructions to an item already in cart

⚠️ IMPORTANT:
- When customer says "add X" or "I want X", you MUST include the [ADD_TO_CART:id:qty] tag. Do NOT just say "I'll add it" without the tag.
- The item_id must be the exact UUID from the menu. Example: [ADD_TO_CART:a1b2c3d4-e5f6-7890-abcd-ef1234567890:1]
- NEVER say "I've added X to your cart" without actually including the [ADD_TO_CART] tag.
- If you can't find the exact item ID, ask the customer to clarify which item they want.
- For checkout, include [PLACE_ORDER] — the system will handle payment options.
- When customer says "no onion", "extra spicy", "less salt", etc., use [ADD_INSTRUCTIONS:ITEM_ID:instruction] for the relevant cart item.`;
}

// ─── Parse AI Response ──────────────────────

interface AIAction {
  type: 'add_to_cart' | 'remove_from_cart' | 'clear_cart' | 'place_order' | 'add_instructions';
  itemId?: string;
  quantity?: number;
  instructions?: string;
}

function parseAIResponse(text: string): { reply: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  let reply = text;

  // Extract [ADD_TO_CART:item_id:quantity]
  const addMatches = text.matchAll(/\[ADD_TO_CART:([^:]+):(\d+)\]/g);
  for (const match of addMatches) {
    actions.push({ type: 'add_to_cart', itemId: match[1], quantity: parseInt(match[2]) });
    reply = reply.replace(match[0], '');
  }

  // Extract [REMOVE_FROM_CART:item_id]
  const removeMatches = text.matchAll(/\[REMOVE_FROM_CART:([^\]]+)\]/g);
  for (const match of removeMatches) {
    actions.push({ type: 'remove_from_cart', itemId: match[1] });
    reply = reply.replace(match[0], '');
  }

  // Extract [CLEAR_CART]
  if (text.includes('[CLEAR_CART]')) {
    actions.push({ type: 'clear_cart' });
    reply = reply.replace('[CLEAR_CART]', '');
  }

  // Extract [PLACE_ORDER]
  if (text.includes('[PLACE_ORDER]')) {
    actions.push({ type: 'place_order' });
    reply = reply.replace('[PLACE_ORDER]', '');
  }

  // Extract [ADD_INSTRUCTIONS:item_id:instructions text]
  const instrMatches = text.matchAll(/\[ADD_INSTRUCTIONS:([^:]+):([^\]]+)\]/g);
  for (const match of instrMatches) {
    actions.push({ type: 'add_instructions', itemId: match[1], instructions: match[2] });
    reply = reply.replace(match[0], '');
  }

  return { reply: reply.trim(), actions };
}

// ─── Execute AI Action ──────────────────────

async function executeAction(
  action: AIAction,
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  cartId: string
): Promise<void> {
  switch (action.type) {
    case 'add_to_cart': {
      if (!action.itemId) return;
      const item = await getMenuItemById(action.itemId);
      if (!item) return;

      const cartItem: CartItem = {
        item_id: item.id,
        item_name: item.name,
        quantity: action.quantity || 1,
        unit_price: item.price,
      };

      await addToCart(cartId, cartItem);
      // Fire-and-forget combo suggestion (non-blocking)
      sendComboSuggestions(restaurant, customer, conversation, action.itemId).catch(() => {});
      break;
    }

    case 'remove_from_cart': {
      if (!action.itemId) return;
      await removeFromCart(cartId, action.itemId);
      break;
    }

    case 'clear_cart': {
      await clearCart(cartId);
      break;
    }

    case 'place_order': {
      // Don't place order here — redirect to payment choice
      // The payment choice flow handles the actual order creation
      break;
    }

    case 'add_instructions': {
      if (!action.itemId || !action.instructions) return;
      await addSpecialInstructions(cartId, action.itemId, action.instructions);
      break;
    }
  }
}

// ─── Utility: Send Bot Text Reply ───────────

async function sendBotReply(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  text: string
): Promise<void> {
  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendTextMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      text,
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', text, undefined, { phone: customer.phone });
}

// ─── Menu Overview (Text Fallback) ──────────

// (handled in sendMenuOverview above with list message)

// ─── Human Handoff ──────────────────────────

async function handleHumanHandoff(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  // Deactivate bot for this conversation
  await setBotActive(conversation.id, false);

  const reply = "I'm connecting you with a team member right now. They'll respond shortly! 🙏\n\nIn the meantime, feel free to describe your query.";
  await sendBotReply(restaurant, customer, conversation, reply);

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'bot',
    action: ACTIONS.BOT_HANDOFF,
    details: { customerPhone: customer.phone, conversationId: conversation.id },
  });
}

// ─── Search Menu Results ────────────────────

async function sendSearchResults(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  query: string
): Promise<void> {
  if (!query || query.length < 2) {
    await sendBotReply(restaurant, customer, conversation, '🔍 Please type *search [item name]* to find menu items.\n\nExample: *search paneer*');
    return;
  }

  const results = await searchMenuItems(restaurant.id, query);

  if (results.length === 0) {
    await sendBotReply(restaurant, customer, conversation, `🔍 No items found for "${query}". Try a different name or send *menu* to browse.`);
    return;
  }

  // Send results as interactive list
  const sections: ListSection[] = [{
    title: `Results for "${query.substring(0, 16)}"`,
    rows: results.slice(0, 10).map((item) => ({
      id: `item_${item.id}`,
      title: item.name.substring(0, 24),
      description: `₹${(item.price / 100).toFixed(0)}${item.is_veg ? ' 🟢' : ' 🔴'}${item.is_bestseller ? ' ⭐' : ''}`,
    })),
  }];

  const bodyText = `🔍 Found ${results.length} item${results.length > 1 ? 's' : ''} matching *"${query}"*\n\nTap to view details and add to cart.`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    try {
      await sendListMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        headerText: `Search: ${query}`,
        bodyText,
        buttonText: '🔍 View Results',
        sections,
      });
    } catch {
      // Fallback to text
      const textResults = results.slice(0, 5).map((i) => `• ${i.name} — ₹${(i.price / 100).toFixed(0)}${i.is_veg ? ' 🟢' : ' 🔴'}`).join('\n');
      await sendBotReply(restaurant, customer, conversation, `🔍 Results for "${query}":\n\n${textResults}\n\nTell me which one you'd like to add!`);
      return;
    }
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Order History ──────────────────────────

async function sendOrderHistory(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const orders = await getCustomerOrders(customer.id, 5);

  if (orders.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '📦 No order history yet!\n\nSend *menu* to place your first order. 🎉');
    return;
  }

  const orderLines = orders.map((o, idx) => {
    const date = new Date(o.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const total = ((o.total as number) / 100).toFixed(0);
    const status = (o.status as string || 'unknown').toUpperCase();
    const rating = o.rating ? `⭐${o.rating}` : '';
    const items = (o.items as Array<Record<string, unknown>> || []).map((i) => i.item_name).join(', ');
    return `${idx + 1}. *#${o.order_number || 'N/A'}* — ${date}\n   ₹${total} · ${status} ${rating}\n   ${items.substring(0, 60)}`;
  }).join('\n\n');

  const bodyText = `📦 *Your Recent Orders*\n\n${orderLines}\n\n💡 Send *reorder* to repeat your last order!`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_reorder', title: '🔄 Reorder Last' },
        { id: 'btn_menu', title: '📋 New Order' },
      ],
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Reorder Last Order ─────────────────────

async function handleReorder(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const orders = await getCustomerOrders(customer.id, 1);

  if (orders.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '📦 No previous orders to reorder!\n\nSend *menu* to place your first order.');
    return;
  }

  const lastOrder = orders[0];
  const items = (lastOrder.items as Array<Record<string, unknown>>) || [];

  if (items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '❌ Could not find items from your last order. Send *menu* to browse.');
    return;
  }

  // Add all items from last order to cart
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  await clearCart(cart.id);

  let addedCount = 0;
  for (const orderItem of items) {
    const itemId = orderItem.item_id as string;
    const qty = (orderItem.quantity as number) || 1;
    const menuItem = await getMenuItemById(itemId);
    if (menuItem && menuItem.is_available) {
      await addToCart(cart.id, {
        item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: qty,
        unit_price: menuItem.price,
      });
      addedCount++;
    }
  }

  if (addedCount === 0) {
    await sendBotReply(restaurant, customer, conversation, '❌ None of your previous items are currently available. Send *menu* to browse new options!');
    return;
  }

  const bodyText = `🔄 *Reorder Ready!*\n\n${addedCount} item${addedCount > 1 ? 's' : ''} from your last order have been added to cart.\n\nReview your cart or proceed to checkout!`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_cart', title: '🛒 View Cart' },
        { id: 'btn_place_order', title: '✅ Checkout' },
        { id: 'btn_menu', title: '📋 Edit Order' },
      ],
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Post-Delivery Feedback Request ─────────

export async function sendFeedbackRequest(
  restaurant: Restaurant,
  orderId: string,
  customerPhone: string
): Promise<void> {
  if (!restaurant.whatsapp_token || !restaurant.whatsapp_phone_id) return;

  const bodyText = `🎉 *Your order has been delivered!*\n\nHow was your experience? Rate us:\n\n⭐ Your feedback helps us serve you better!`;

  try {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customerPhone,
      bodyText,
      buttons: [
        { id: `rate_5_${orderId}`, title: '⭐⭐⭐⭐⭐ Great!' },
        { id: `rate_3_${orderId}`, title: '⭐⭐⭐ Okay' },
        { id: `rate_1_${orderId}`, title: '⭐ Poor' },
      ],
    });
  } catch (e) {
    console.warn('[Orchestrator] Feedback request failed:', e);
  }
}

// ─── Send Digital Receipt PDF ───────────────

export async function sendOrderReceipt(
  restaurant: Restaurant,
  orderId: string,
  customerPhone: string
): Promise<void> {
  if (!restaurant.whatsapp_token || !restaurant.whatsapp_phone_id) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.in';
  const receiptUrl = `${appUrl}/api/receipt?orderId=${orderId}`;

  try {
    await sendDocumentMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customerPhone,
      documentUrl: receiptUrl,
      filename: `receipt-${orderId.substring(0, 8)}.pdf`,
      caption: '🧾 Here\'s your order receipt. Thank you for ordering!',
    });
  } catch (e) {
    // Fallback: send receipt as a link
    console.warn('[Orchestrator] Document message failed, sending link:', e);
    try {
      await sendTextMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customerPhone,
        text: `🧾 *Your Receipt*\n\nDownload your invoice here:\n${receiptUrl}\n\nThank you for ordering from ${restaurant.name}! 🙏`,
      });
    } catch {
      console.error('[Orchestrator] Receipt delivery failed completely');
    }
  }
}

// ─── Combo / Upsell Suggestions ─────────────

async function sendComboSuggestions(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  justAddedItemId: string
): Promise<void> {
  try {
    const menu = await getFullMenu(restaurant.id);
    if (!menu) return;

    // Get the item that was just added
    const addedItem = menu.categories
      .flatMap(c => c.items)
      .find(i => i.id === justAddedItemId);
    if (!addedItem) return;

    // Find items from a DIFFERENT category (complementary)
    const addedCategoryId = addedItem.category_id;
    const otherItems = menu.categories
      .filter(c => c.id !== addedCategoryId)
      .flatMap(c => c.items)
      .filter(i => i.is_available && i.is_bestseller) // Only suggest bestsellers
      .slice(0, 3);

    if (otherItems.length === 0) return;

    // Also check if drinks/beverages category exists for food items
    const drinkCategory = menu.categories.find(c =>
      c.name.toLowerCase().includes('drink') ||
      c.name.toLowerCase().includes('beverage') ||
      c.name.toLowerCase().includes('shake') ||
      c.name.toLowerCase().includes('lassi') ||
      c.name.toLowerCase().includes('juice')
    );

    const suggestions = drinkCategory
      ? drinkCategory.items.filter(i => i.is_available).slice(0, 3)
      : otherItems;

    if (suggestions.length === 0) return;

    const suggestionText = suggestions
      .map(s => `• ${s.name} — ₹${(s.price / 100).toFixed(0)}${s.is_bestseller ? ' ⭐' : ''}`)
      .join('\n');

    await sendBotReply(restaurant, customer, conversation,
      `💡 *Goes great with your order:*\n\n${suggestionText}\n\nJust type the item name to add!`
    );
  } catch (e) {
    console.warn('[Orchestrator] Combo suggestion failed:', e);
  }
}

// ─── Estimated Delivery Time ────────────────

function getEstimatedDeliveryTime(itemCount: number, deliveryType: string): string {
  if (deliveryType === 'pickup' || deliveryType === 'dine_in') {
    const prepMinutes = Math.max(15, itemCount * 5);
    return `${prepMinutes}-${prepMinutes + 10} mins`;
  }
  // Delivery: prep time + delivery buffer
  const prepMinutes = Math.max(15, itemCount * 5);
  const deliveryBuffer = 15; // 15 min avg delivery
  const totalMin = prepMinutes + deliveryBuffer;
  const totalMax = totalMin + 10;
  return `${totalMin}-${totalMax} mins`;
}

// ─── Add Special Instructions to Cart Item ──

async function addSpecialInstructions(
  cartId: string,
  itemId: string,
  instructions: string
): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: cartData } = await supabaseAdmin
    .from('cart_sessions')
    .select('items')
    .eq('id', cartId)
    .single();

  if (!cartData) return;

  const items = ((cartData as Record<string, unknown>).items as CartItem[]) || [];
  const idx = items.findIndex(i => i.item_id === itemId);
  if (idx >= 0) {
    items[idx].special_instructions = instructions;
    await supabaseAdmin
      .from('cart_sessions')
      .update({ items, updated_at: new Date().toISOString() })
      .eq('id', cartId);
  }
}
