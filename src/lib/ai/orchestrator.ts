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
import { notifyOwnerNewOrder } from '@/lib/services/owner-notifications';
import { sendTextMessage, sendReplyButtons, sendListMessage, sendImageMessage, sendDocumentMessage, sendCarouselMessage, type ListSection, type CarouselCard } from '@/lib/whatsapp/client';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';
import { checkAiLimit, logAiUsage } from '@/lib/utils/enforce-limits';

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
  media?: {
    type: string;       // 'image' | 'video' | 'audio' | 'document' | 'sticker'
    mediaId: string;
    mimeType?: string;
    caption?: string;
  };
}): Promise<void> {
  const { phoneNumberId, from, messageId, text, interactiveReply, whatsappName, location, media } = params;

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

  // 5.5 Handle media messages — acknowledge but explain we can't process images
  if (media && !text) {
    const mediaResponses: Record<string, string> = {
      image: '📸 Thanks for the image! I can only read text messages right now. How can I help you? Type *menu* to browse our menu.',
      video: '🎥 I received your video! I can only process text messages at the moment. Type *menu* to see our menu.',
      audio: '🎙️ I got your voice message! I can\'t listen to audio yet — could you type your request instead?',
      document: '📄 I received your document! I can only handle text for now. How can I help you?',
      sticker: '😊 Nice sticker! How can I help you today? Type *menu* to browse our menu.',
    };
    const response = mediaResponses[media.type] || '👋 I received your message! I can only process text right now. Type *menu* to get started.';
    await sendBotReply(restaurant, customer, conversation, response);
    return;
  }

  // 6. Handle interactive button/list replies by ID
  if (interactiveReply) {
    await handleInteractiveReply(restaurant, customer, conversation, interactiveReply);
    return;
  }

  // 6.1 Auto-detect Hindi from first message
  if ((customer.total_orders || 0) === 0 && !customer.language_preference) {
    const hindiPattern = /[\u0900-\u097F]/;
    if (hindiPattern.test(text || '')) {
      await setCustomerLanguage(customer.id, 'hi');
      customer.language_preference = 'hi';
    }
  }

  // 7. Handle special commands
  const lowerText = (text || '').toLowerCase().trim();

  // Smart greeting detection — catches misspellings, variations, and first messages
  if (isGreeting(lowerText, customer)) {
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
  if (lowerText === 'agent' || lowerText === 'human' || lowerText === 'help') {
    await handleHumanHandoff(restaurant, customer, conversation);
    return;
  }
  // ── Operating Hours Check ──
  if (lowerText === 'checkout' || lowerText === 'order' || lowerText === 'place order') {
    if (!isRestaurantOpen(restaurant)) {
      const todayHours = getTodayHoursText(restaurant);
      const msg = todayHours
        ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
        : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
      await sendBotReply(restaurant, customer, conversation, msg);
      return;
    }
    await askForDeliveryAddress(restaurant, customer, conversation);
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
    await sendBotReply(restaurant, customer, conversation, '✅ भाषा हिंदी में बदल दी गई है! 🇮🇳\nमेनू देखने के लिए *menu* भेजें।');
    return;
  }
  if (lowerText === 'english') {
    await setCustomerLanguage(customer.id, 'en');
    customer.language_preference = 'en';
    await sendBotReply(restaurant, customer, conversation, '✅ Language switched to English! 🇬🇧\nSend *menu* to browse our menu.');
    return;
  }

  // 6.5 Check if bot asked for delivery address — treat this text as the address
  const recentMsgs = await getRecentMessages(conversation.id);
  const lastBotMsg = [...recentMsgs].reverse().find((m) => m.role === 'assistant');
  if (lastBotMsg && lastBotMsg.content.includes('delivery address')) {
    // User replied with their address — save and proceed to payment
    const address = text || '';
    await addSavedAddress(customer.id, address);
    await sendBotReply(restaurant, customer, conversation, `📍 *Address saved:* ${address}`);
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

  // 6.6 Safety net: Detect menu item names in free-text messages
  // This catches cases where carousel button clicks arrive as text instead of interactive
  const rawText = text || '';
  const handled = await tryMatchTextToAction(restaurant, customer, conversation, rawText);
  if (handled) return;

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
      `📍 *Delivery location set!*\n${addressStr}`
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
      `📍 *Location saved!*\n${addressStr}\nSend *menu* to start ordering 🍽️`
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

    case 'btn_place_order': {
      // Guard: prevent stale checkout after order already placed
      if (await hasRecentOrder(restaurant.id, customer.id)) {
        await sendBotReply(restaurant, customer, conversation, '✅ You already placed an order just now! Send *orders* to check status.');
        break;
      }
      const checkCart = await getOrCreateCart(restaurant.id, customer.id);
      if (checkCart.items.length === 0) {
        await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty! Browse the *menu* to add items first.');
        break;
      }
      await askForDeliveryAddress(restaurant, customer, conversation);
      break;
    }

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

    case 'btn_skip_address': {
      // Guard: prevent stale checkout
      if (await hasRecentOrder(restaurant.id, customer.id)) {
        await sendBotReply(restaurant, customer, conversation, '✅ You already placed an order just now! Send *orders* to check status.');
        break;
      }
      await sendPaymentChoice(restaurant, customer, conversation);
      break;
    }

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

    case 'btn_categories':
      await sendMenuOverview(restaurant, customer, conversation);
      break;

    case 'btn_bestsellers':
      await sendMenuOverview(restaurant, customer, conversation, 'bestseller');
      break;

    case 'btn_location':
      await sendBotReply(restaurant, customer, conversation, '📍 Share your *live location* by tapping 📎 → Location.\nThis helps us deliver faster!');
      break;

    default:
      // Handle dynamic IDs: item_uuid, add_uuid, inc_uuid, dec_uuid, rate_N_uuid, addr_N, cat_uuid, cat_uuid_pN
      if (btnId.startsWith('cat_') && btnId.includes('_p')) {
        // Category pagination: cat_<catId>_p<page>
        const match = btnId.match(/^cat_(.+)_p(\d+)$/);
        if (match) {
          await sendCategoryItems(restaurant, customer, conversation, match[1], parseInt(match[2]));
        }
      } else if (btnId.startsWith('cat_')) {
        // Category selection: cat_<catId>
        await sendCategoryItems(restaurant, customer, conversation, btnId.replace('cat_', ''));
      } else if (btnId.startsWith('item_')) {
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
        const ratingMsg = rating >= 4
          ? `${'\u2b50'.repeat(rating)} Thank you! We're glad you loved it \ud83c\udf89`
          : `${'\u2b50'.repeat(rating)} Thanks for the honest feedback \u2014 we'll do better next time \ud83d\ude4f`;
        await sendBotReply(restaurant, customer, conversation, ratingMsg);
      } else if (btnId.startsWith('addr_')) {
        const idx = parseInt(btnId.replace('addr_', ''));
        const addresses = await getSavedAddresses(customer.id);
        if (addresses[idx]) {
          await sendBotReply(restaurant, customer, conversation, `📍 *Address:* ${addresses[idx]}`);
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

// ─── Text-to-Action Safety Net ──────────────
// Catches free-text messages that contain menu item names
// or action phrases. This is critical for carousel button clicks
// that arrive as text instead of interactive payloads.

async function tryMatchTextToAction(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; loyalty_tier: string; total_orders: number },
  conversation: { id: string; context: Record<string, unknown> },
  rawText: string
): Promise<boolean> {
  const text = rawText.trim();
  if (!text || text.length < 2) return false;

  const lower = text.toLowerCase();

  // 1. Check for common action phrases with expanded matching
  const checkoutPhrases = ['place my order', 'place order', 'confirm order', 'pay now', 'proceed to pay', 'i want to pay', 'lets pay', "let's pay"];
  const cartPhrases = ['show my cart', 'whats in my cart', "what's in my cart", 'show cart', 'open cart'];
  const addMorePhrases = ['add more', 'more items', 'show more', 'browse more'];

  if (checkoutPhrases.some(p => lower.includes(p))) {
    await askForDeliveryAddress(restaurant, customer, conversation);
    return true;
  }
  if (cartPhrases.some(p => lower.includes(p))) {
    await sendCartSummary(restaurant, customer, conversation);
    return true;
  }
  if (addMorePhrases.some(p => lower.includes(p))) {
    await sendMenuOverview(restaurant, customer, conversation);
    return true;
  }

  // 2. Try to match menu item names in the text
  const menu = await getFullMenu(restaurant.id);
  if (!menu) return false;

  const allItems = menu.categories.flatMap(c => c.items).filter(i => i.is_available);
  if (allItems.length === 0) return false;

  // Strip emoji/special chars for matching
  const cleanText = lower
    .replace(/[🛒✅📋🟢🔴⭐·₹\-~]/g, '')
    .replace(/\d+\s*mins?/gi, '')
    .replace(/\d+/g, '')
    .replace(/add to cart/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Try exact item name match first
  let matchedItem = allItems.find(item =>
    cleanText === item.name.toLowerCase()
  );

  // Then try if the text contains the item name (or vice versa)
  if (!matchedItem) {
    matchedItem = allItems.find(item =>
      cleanText.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(cleanText)
    );
  }

  // Fuzzy match — handle misspellings (e.g., "panner tikka" → "paneer tikka")
  if (!matchedItem && cleanText.length >= 4) {
    let bestScore = 0;
    let bestItem: typeof allItems[0] | undefined;

    for (const item of allItems) {
      const itemName = item.name.toLowerCase();
      const score = fuzzyScore(cleanText, itemName);
      if (score > bestScore && score >= 0.6) { // 60% similarity threshold
        bestScore = score;
        bestItem = item;
      }
    }

    if (bestItem) {
      console.log(`[Orchestrator] Fuzzy matched: "${text}" → ${bestItem.name} (score: ${bestScore.toFixed(2)})`);
      matchedItem = bestItem;
    }
  }

  // If we matched an item, add it to cart
  if (matchedItem) {
    console.log(`[Orchestrator] Text matched to menu item: "${text}" → ${matchedItem.name} (${matchedItem.id})`);
    await handleDirectAddToCart(restaurant, customer, conversation, matchedItem.id);
    return true;
  }

  // 3. Check if user is confirming the last bot suggestion
  // e.g. bot said "You can try our Paneer Makhani for ₹199" → user says "ok" / "yes" / "sure" / "add it"
  const confirmPhrases = ['ok', 'okay', 'yes', 'sure', 'yes please', 'add it', 'go ahead', 'order it', "let's order", 'lets order', 'ok add', 'haan', 'ha', 'theek hai', 'thik hai'];
  if (confirmPhrases.includes(lower) || confirmPhrases.some(p => lower === p)) {
    const recentMsgs = await getRecentMessages(conversation.id, 5);
    const lastBot = [...recentMsgs].reverse().find(m => m.role === 'assistant');
    if (lastBot) {
      // Try to extract item name from bot's suggestion
      const botText = lastBot.content.toLowerCase();
      const suggestedItem = allItems.find(item =>
        botText.includes(item.name.toLowerCase())
      );
      if (suggestedItem) {
        console.log(`[Orchestrator] User confirmed suggestion: "${text}" → adding ${suggestedItem.name}`);
        await handleDirectAddToCart(restaurant, customer, conversation, suggestedItem.id);
        return true;
      }
    }
  }

  return false;
}

// ─── Fuzzy Score: Word-overlap + character similarity ──────
// Returns 0-1 score. Higher = more similar.
function fuzzyScore(input: string, target: string): number {
  const inputWords = input.split(/\s+/).filter(Boolean);
  const targetWords = target.split(/\s+/).filter(Boolean);

  if (inputWords.length === 0 || targetWords.length === 0) return 0;

  // Word-level overlap: how many input words roughly match target words
  let wordMatches = 0;
  for (const iw of inputWords) {
    for (const tw of targetWords) {
      // Exact word match or close enough (Levenshtein distance <= 2)
      if (iw === tw || levenshtein(iw, tw) <= Math.max(1, Math.floor(tw.length * 0.3))) {
        wordMatches++;
        break;
      }
    }
  }

  // Score = matched words / max words
  const maxWords = Math.max(inputWords.length, targetWords.length);
  return wordMatches / maxWords;
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[b.length][a.length];
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
  const desc = item.description ? `\n${item.description}` : '';

  const bodyText = `*${item.name}*${star}\n${veg} \u00b7 \u20b9${priceRupees}${desc}\n\u23f1 ~${item.prep_time_minutes || 15} mins`;

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

  const bodyText = `✅ *${item.name}* added!\n\n🛒 Cart: ${itemCount} item${itemCount > 1 ? 's' : ''} · ₹${totalRupees}`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_categories', title: '📋 Add More' },
        { id: 'btn_cart', title: '🛒 View Cart' },
        { id: 'btn_place_order', title: '✅ Checkout' },
      ],
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Smart Greeting Detection ───────────────
// Catches misspellings, variations, Hindi, slang, and first-time messages

const GREETING_EXACT = new Set([
  // English
  'hi', 'hello', 'hey', 'hii', 'hiii', 'hiiii', 'helo', 'hllo',
  'helloo', 'hellooo', 'hemlo', 'henlo', 'hola', 'yo', 'yoo', 'yooo',
  'heya', 'heyy', 'heyyy', 'hai', 'haii',
  'sup', 'wassup', 'whatsup', 'wazzup', 'watsup',
  'start', 'begin', 'get started',
  // Hindi / Hinglish
  'namaste', 'namaskar', 'namastey', 'namasthe',
  'kya haal', 'kya hal', 'kaise ho', 'kese ho',
  'jai shree ram', 'jai shri ram', 'ram ram', 'radhe radhe',
  // Single emoji greetings
  '👋', '🙏', '✋', '🤙', '👋🏻', '🙏🏻',
]);

const GREETING_PREFIXES = [
  'good morning', 'good afternoon', 'good evening', 'good night',
  'gm', 'gn', 'morning', 'evening',
  'hey there', 'hi there', 'hello there',
  'howdy', 'greetings',
];

function isGreeting(text: string, customer: { total_orders?: number }): boolean {
  if (!text) return false;

  // 1. Exact match (most common)
  if (GREETING_EXACT.has(text)) return true;

  // 2. Prefix match (good morning X, hey there!)
  if (GREETING_PREFIXES.some(p => text.startsWith(p))) return true;

  // 3. New customer with short message — always show greeting with buttons
  // First interaction should ALWAYS be the premium button experience
  if ((customer.total_orders || 0) === 0 && text.length <= 30) {
    // Only if it's not a clear food order or command
    const foodIndicators = ['add', 'order', 'want', 'give', 'send', 'menu', 'cart', 'checkout'];
    if (!foodIndicators.some(f => text.includes(f))) return true;
  }

  // 4. Fuzzy match against core greeting words
  // Catches "hemlo" (edit distance 1 from "hello"), "helo", "helllo", etc.
  const coreGreetings = ['hello', 'hi', 'hey', 'namaste', 'start'];
  const firstWord = text.split(/\s+/)[0] || '';
  if (firstWord.length >= 2 && firstWord.length <= 10) {
    for (const g of coreGreetings) {
      const dist = levenshtein(firstWord, g);
      // Allow 1 typo for short words, 2 for longer
      const maxDist = g.length <= 3 ? 1 : 2;
      if (dist <= maxDist) return true;
    }
  }

  return false;
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
    bodyText = isReturning
      ? `${greeting}\n\n🏪 *${restaurant.name}*\nवापस आने पर खुशी हुई! 🎉\n\nआज क्या ऑर्डर करना चाहेंगे?`
      : `${greeting}\n\n🏪 *${restaurant.name}*\nमैं आपका ऑर्डरिंग असिस्टेंट हूँ 🤖\n\n📋 मेनू देखें\n🛒 कार्ट में आइटम जोड़ें\n✅ ऑर्डर प्लेस करें\n\nशुरू करें! 👇`;
  } else {
    const greeting = customer.name ? `Hey ${customer.name}! 👋` : 'Hey there! 👋';
    bodyText = isReturning
      ? `${greeting}\n\n🏪 *${restaurant.name}*\nGreat to see you again! 🎉\n\nWhat are you craving today?`
      : `${greeting}\n\n🏪 *${restaurant.name}*\nI'm your personal ordering assistant 🤖\n\n📋 Browse our menu with photos\n🛒 Add items to cart\n✅ Checkout & pay\n\nLet's get started! 👇`;
  }

  const buttons = isReturning
    ? [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_reorder', title: '🔄 Reorder Last' },
        { id: 'btn_orders', title: '📦 My Orders' },
      ]
    : [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_bestsellers', title: '⭐ Bestsellers' },
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

  // ── AI Recommendation for returning customers (3+ orders) ──
  if (isReturning && (customer.total_orders || 0) >= 3) {
    sendPersonalizedRecommendation(restaurant, customer, conversation).catch(e =>
      console.warn('[Orchestrator] Recommendation failed:', e)
    );
  }
}

// ─── AI-Powered Personalized Recommendations ──

async function sendPersonalizedRecommendation(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  if (!restaurant.whatsapp_token || !restaurant.whatsapp_phone_id) return;

  try {
    // Wait a beat so it comes after the greeting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get customer's past order items
    const pastOrders = await getCustomerOrders(customer.id, 10);
    if (pastOrders.length === 0) return;

    // Count item frequency from past orders
    const itemFrequency = new Map<string, { name: string; count: number; menuItemId?: string }>();
    for (const order of pastOrders) {
      const items = (order.items as Array<Record<string, unknown>>) || [];
      for (const item of items) {
        const name = item.item_name as string;
        const menuItemId = item.menu_item_id as string | undefined;
        if (!name) continue;
        const existing = itemFrequency.get(name) || { name, count: 0, menuItemId };
        existing.count += (item.quantity as number) || 1;
        if (menuItemId) existing.menuItemId = menuItemId;
        itemFrequency.set(name, existing);
      }
    }

    // Get top 3 most-ordered items
    const favorites = Array.from(itemFrequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (favorites.length === 0) return;

    // Get current menu to check availability and find IDs
    const menu = await getFullMenu(restaurant.id);
    if (!menu) return;

    const allMenuItems = menu.categories.flatMap(c => c.items);

    // Match favorites to available menu items
    const availableRecs: { name: string; id: string; price: number; count: number }[] = [];
    for (const fav of favorites) {
      // Try exact match by ID first, then by name
      const menuItem = fav.menuItemId
        ? allMenuItems.find(m => m.id === fav.menuItemId && m.is_available)
        : allMenuItems.find(m =>
            m.name.toLowerCase() === fav.name.toLowerCase() && m.is_available
          );
      if (menuItem) {
        availableRecs.push({
          name: menuItem.name,
          id: menuItem.id,
          price: menuItem.price,
          count: fav.count,
        });
      }
    }

    if (availableRecs.length === 0) return;

    // Build recommendation message
    const recList = availableRecs
      .map((r, i) => `${i + 1}. *${r.name}* — ₹${(r.price / 100).toFixed(0)} (ordered ${r.count}x)`)
      .join('\n');

    const recText = `🎯 *Your Favorites*\nBased on your past orders:\n\n${recList}\n\nQuick add below! 👇`;

    // Send as reply buttons (max 3)
    const recButtons = availableRecs.slice(0, 3).map(r => ({
      id: `add_${r.id}`,
      title: `➕ ${r.name.substring(0, 16)}`,
    }));

    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText: recText,
      buttons: recButtons,
    });

    await saveMessage(conversation.id, restaurant.id, 'bot', recText, undefined, { phone: customer.phone });
  } catch (e) {
    console.warn('[Orchestrator] Personalized recommendation error:', e);
  }
}

// ─── Menu Overview (Category Picker) ────────

async function sendMenuOverview(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; language_preference?: string },
  conversation: { id: string },
  dietaryFilter?: 'veg' | 'nonveg' | 'bestseller'
): Promise<void> {
  const menu = await getFullMenu(restaurant.id);

  if (!menu || menu.categories.length === 0) {
    await sendBotReply(restaurant, customer, conversation,
      `Welcome to ${restaurant.name}! 🌿\nOur menu is being set up — check back soon!`);
    return;
  }

  // If dietary filter is applied, show matching items directly via carousel
  if (dietaryFilter) {
    const allItems = menu.categories.flatMap(cat => cat.items.filter(item => {
      if (dietaryFilter === 'veg') return item.is_veg;
      if (dietaryFilter === 'nonveg') return !item.is_veg;
      if (dietaryFilter === 'bestseller') return item.is_bestseller;
      return true;
    }));

    if (allItems.length === 0) {
      const filterName = dietaryFilter === 'veg' ? 'vegetarian' : dietaryFilter === 'nonveg' ? 'non-veg' : 'bestseller';
      await sendBotReply(restaurant, customer, conversation, `No ${filterName} items found. Send *menu* to see the full menu.`);
      return;
    }

    const filterLabel = dietaryFilter === 'veg' ? '🟢 Veg' : dietaryFilter === 'nonveg' ? '🔴 Non-Veg' : '⭐ Bestsellers';
    const itemsWithImages = allItems.filter(i => i.image_url);

    if (itemsWithImages.length >= 2 && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
      const cards: CarouselCard[] = itemsWithImages.slice(0, 10).map(item => ({
        imageUrl: item.image_url!,
        body: `${item.is_veg ? '🟢' : '🔴'} *${item.name}*${item.is_bestseller ? ' ⭐' : ''}\n₹${(item.price / 100).toFixed(0)} · ~${item.prep_time_minutes || 15} mins${item.description ? '\n' + item.description.substring(0, 60) : ''}`,
        buttons: [{ id: `add_${item.id}`, title: '🛒 Add to Cart' }],
      }));

      try {
        await sendCarouselMessage({
          phoneNumberId: restaurant.whatsapp_phone_id,
          accessToken: restaurant.whatsapp_token,
          to: customer.phone,
          bodyText: `${filterLabel} from *${restaurant.name}* 🍽️`,
          cards,
        });
        // Wait for carousel to be delivered before sending nav buttons
        await new Promise(resolve => setTimeout(resolve, 1500));
        await sendReplyButtons({
          phoneNumberId: restaurant.whatsapp_phone_id,
          accessToken: restaurant.whatsapp_token,
          to: customer.phone,
          bodyText: `${cards.length} ${filterLabel.toLowerCase()} items above ☝️`,
          buttons: [
            { id: 'btn_categories', title: '📋 All Categories' },
            { id: 'btn_cart', title: '🛒 View Cart' },
            { id: 'btn_place_order', title: '✅ Checkout' },
          ],
        });
        await saveMessage(conversation.id, restaurant.id, 'bot', `Sent ${filterLabel} carousel`, undefined, { phone: customer.phone });
        return;
      } catch (e) {
        console.warn('[Orchestrator] Filter carousel failed, falling back:', e);
      }
    }

    // Fallback: text list for filter
    const textList = allItems.slice(0, 15).map(i =>
      `${i.is_veg ? '🟢' : '🔴'} *${i.name}*${i.is_bestseller ? ' ⭐' : ''} — ₹${(i.price / 100).toFixed(0)}`
    ).join('\n');
    await sendBotReply(restaurant, customer, conversation, `${filterLabel} Menu 🍽️\n\n${textList}\n\nTell me what you'd like to add!`);
    return;
  }

  // Default: Show category picker as interactive list
  const sections: ListSection[] = [{
    title: '📂 Menu Categories',
    rows: menu.categories.slice(0, 10).map(cat => ({
      id: `cat_${cat.id}`,
      title: cat.name.substring(0, 24),
      description: `${cat.items.length} item${cat.items.length > 1 ? 's' : ''}`,
    })),
  }];

  const isHindi = customer.language_preference === 'hi';
  const bodyText = isHindi
    ? `कैटेगरी चुनें और फोटो के साथ आइटम देखें! 🍽️`
    : `Pick a category to browse items with photos! 🍽️`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    try {
      await sendListMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        headerText: `${restaurant.name} Menu`,
        bodyText,
        footerText: 'Items shown as visual cards',
        buttonText: '📋 Browse Categories',
        sections,
      });
    } catch (e) {
      console.warn('[Orchestrator] Category list failed:', e);
      const textMenu = menu.categories
        .map(c => `📂 *${c.name}* (${c.items.length} items)`)
        .join('\n');
      await sendBotReply(restaurant, customer, conversation,
        `${restaurant.name} Menu 🍽️\n\n${textMenu}\n\nTell me a category name or what you'd like!`);
      return;
    }
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Category Items (Carousel Cards) ────────

async function sendCategoryItems(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string },
  categoryId: string,
  page: number = 0
): Promise<void> {
  const menu = await getFullMenu(restaurant.id);
  if (!menu) {
    await sendBotReply(restaurant, customer, conversation, '❌ Menu not available right now.');
    return;
  }

  const category = menu.categories.find(c => c.id === categoryId);
  if (!category || category.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '❌ Category not found. Send *menu* to browse.');
    return;
  }

  const availableItems = category.items.filter(i => i.is_available);
  const PAGE_SIZE = 10;
  const startIdx = page * PAGE_SIZE;
  const pageItems = availableItems.slice(startIdx, startIdx + PAGE_SIZE);
  const hasMore = availableItems.length > startIdx + PAGE_SIZE;

  if (pageItems.length === 0) {
    await sendBotReply(restaurant, customer, conversation, `📂 *${category.name}* — no items available right now.`);
    return;
  }

  const itemsWithImages = pageItems.filter(i => i.image_url);
  const itemsWithoutImages = pageItems.filter(i => !i.image_url);

  // Carousel for items with images (min 2 required by WhatsApp)
  if (itemsWithImages.length >= 2 && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    const cards: CarouselCard[] = itemsWithImages.map(item => ({
      imageUrl: item.image_url!,
      body: `${item.is_veg ? '🟢' : '🔴'} *${item.name}*${item.is_bestseller ? ' ⭐' : ''}\n₹${(item.price / 100).toFixed(0)} · ~${item.prep_time_minutes || 15} mins${item.description ? '\n' + item.description.substring(0, 60) : ''}`,
      buttons: [{ id: `add_${item.id}`, title: '🛒 Add to Cart' }],
    }));

    try {
      await sendCarouselMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        bodyText: `📂 *${category.name}* · ${availableItems.length} items\nSwipe through & tap to add! 👉`,
        cards,
      });
    } catch (e) {
      console.warn('[Orchestrator] Carousel failed for category:', e);
      itemsWithoutImages.push(...itemsWithImages);
      itemsWithImages.length = 0;
    }
  } else if (itemsWithImages.length === 1 && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Single image item — send as image + buttons
    const item = itemsWithImages[0];
    try {
      await sendImageMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        imageUrl: item.image_url!,
        caption: `${item.is_veg ? '🟢' : '🔴'} ${item.name}${item.is_bestseller ? ' ⭐' : ''} — ₹${(item.price / 100).toFixed(0)}`,
      });
      await sendReplyButtons({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        bodyText: `*${item.name}*\n₹${(item.price / 100).toFixed(0)} · ~${item.prep_time_minutes || 15} mins${item.description ? '\n' + item.description : ''}`,
        buttons: [
          { id: `add_${item.id}`, title: '🛒 Add to Cart' },
          { id: 'btn_categories', title: '📋 Categories' },
        ],
      });
    } catch (e) {
      itemsWithoutImages.push(item);
    }
  }

  // Items without images → interactive list or text
  if (itemsWithoutImages.length > 0) {
    if (itemsWithImages.length >= 2) {
      // Already sent carousel above; show remaining as text
      const textList = itemsWithoutImages.map(i =>
        `${i.is_veg ? '🟢' : '🔴'} *${i.name}*${i.is_bestseller ? ' ⭐' : ''} — ₹${(i.price / 100).toFixed(0)}`
      ).join('\n');
      await sendBotReply(restaurant, customer, conversation, `Also in *${category.name}*:\n\n${textList}\n\nJust tell me the item name to add!`);
    } else if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
      // No carousel sent — use interactive list
      const sections: ListSection[] = [{
        title: category.name.substring(0, 24),
        rows: itemsWithoutImages.slice(0, 10).map(item => ({
          id: `item_${item.id}`,
          title: item.name.substring(0, 24),
          description: `₹${(item.price / 100).toFixed(0)}${item.is_veg ? ' 🟢' : ' 🔴'}${item.is_bestseller ? ' ⭐' : ''}`,
        })),
      }];

      await sendListMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        headerText: `📂 ${category.name}`,
        bodyText: `${availableItems.length} items\nTap below to browse!`,
        footerText: 'Tap an item for details',
        buttonText: '🍽️ View Items',
        sections,
      });
    }
  }

  // Navigation buttons after items — delay to ensure carousel arrives first
  // WhatsApp processes image carousels slower than text buttons
  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Wait for carousel to be delivered before sending nav buttons
    await new Promise(resolve => setTimeout(resolve, 1500));

    const navButtons: { id: string; title: string }[] = [];
    if (hasMore) {
      navButtons.push({ id: `cat_${categoryId}_p${page + 1}`, title: '➡️ More Items' });
    }
    navButtons.push({ id: 'btn_categories', title: '📋 Categories' });
    navButtons.push(hasMore ? { id: 'btn_cart', title: '🛒 View Cart' } : { id: 'btn_place_order', title: '✅ Checkout' });

    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText: hasMore
        ? `Showing ${startIdx + 1}–${startIdx + pageItems.length} of ${availableItems.length} in *${category.name}*`
        : `That's everything in *${category.name}*! 😋`,
      buttons: navButtons.slice(0, 3),
    });
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', `Sent ${category.name} items (page ${page + 1})`, undefined, { phone: customer.phone });
}

// ─── Cart Summary with Buttons ──────────────

async function sendCartSummary(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);

  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Your cart is empty!\nSend *menu* to start adding items.');
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

  let cartText = `🛒 *Your Cart*\n${itemLines}\n— — — — — —\nSubtotal: ₹${subtotalR}`;
  if (parseInt(taxR) > 0) cartText += `\nTax: ₹${taxR}`;
  if (parseInt(deliveryR) > 0) cartText += `\n🚚 Delivery: ₹${deliveryR}`;
  cartText += `\n*Total: ₹${totalR}*`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    // Build list sections for editing cart
    const editRows = cart.items.flatMap((i) => [
      { id: `inc_${i.item_id}`, title: `➕ Add: ${i.item_name.substring(0, 15)}`, description: `Add 1 (Current: ${i.quantity})` },
      { id: `dec_${i.item_id}`, title: `➖ Less: ${i.item_name.substring(0, 15)}`, description: i.quantity === 1 ? 'Remove from cart' : `Remove 1 (Current: ${i.quantity})` },
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
  // Check if restaurant is open
  if (!isRestaurantOpen(restaurant)) {
    const todayHours = getTodayHoursText(restaurant);
    const msg = todayHours
      ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
      : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
    await sendBotReply(restaurant, customer, conversation, msg);
    return;
  }

  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Cart is empty! Send *menu* to browse.');
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
      bodyText: '📍 *Where should we deliver?*\nSelect a saved address or type a new one.',
      buttonText: '📍 Choose Address',
      sections,
    });
    await saveMessage(conversation.id, restaurant.id, 'bot', 'Choose delivery address or type new one', undefined, { phone: customer.phone });
  } else {
    const bodyText = '📍 *Where should we deliver?*\nType your address or share your location.';
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
    // Shows updated cart below
  } else {
    await updateCartItemQuantity(cart.id, itemId, item.quantity - 1);
    // Shows updated cart below
  }
  await sendCartSummary(restaurant, customer, conversation);
}

// ─── Payment Choice ─────────────────────────

async function sendPaymentChoice(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  // Check if restaurant is open
  if (!isRestaurantOpen(restaurant)) {
    const todayHours = getTodayHoursText(restaurant);
    const msg = todayHours
      ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
      : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
    await sendBotReply(restaurant, customer, conversation, msg);
    return;
  }

  const cart = await getOrCreateCart(restaurant.id, customer.id);

  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Cart is empty! Send *menu* to add items.');
    return;
  }

  const subtotalRupees = (cart.subtotal / 100).toFixed(0);
  const deliveryRupees = (cart.delivery_fee / 100).toFixed(0);
  const taxRupees = (cart.tax / 100).toFixed(0);
  const totalRupees = (cart.total / 100).toFixed(0);

  // Premium itemized receipt
  const itemLines = cart.items.map((i, idx) => {
    const itemTotal = ((i.unit_price * i.quantity) / 100).toFixed(0);
    return `${idx + 1}. ${i.item_name} × ${i.quantity}  ₹${itemTotal}`;
  }).join('\n');

  const estimatedTime = getEstimatedDeliveryTime(cart.items.length, 'delivery');

  let bodyText = `🧾 *Order Summary*\n━━━━━━━━━━━━━━\n${itemLines}\n━━━━━━━━━━━━━━`;
  bodyText += `\n   Subtotal:  ₹${subtotalRupees}`;
  if (parseInt(taxRupees) > 0) bodyText += `\n   Tax:       ₹${taxRupees}`;
  if (parseInt(deliveryRupees) > 0) bodyText += `\n   🚚 Delivery: ₹${deliveryRupees}`;
  bodyText += `\n━━━━━━━━━━━━━━`;
  bodyText += `\n   💰 *Total: ₹${totalRupees}*`;
  bodyText += `\n   ⏱️ Ready in ~${estimatedTime}`;
  bodyText += `\n\nChoose your payment method 👇`;

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

// ─── Duplicate Order Guard ──────────────────

async function hasRecentOrder(restaurantId: string, customerId: string, withinMinutes = 2): Promise<boolean> {
  const { createClient: createAdmin } = await import('@supabase/supabase-js');
  const supabaseAdmin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .gte('created_at', cutoff)
    .limit(1);
  return (data && data.length > 0) || false;
}

// ─── COD Order ──────────────────────────────

async function handleCODOrder(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  // Check if restaurant is open
  if (!isRestaurantOpen(restaurant)) {
    const todayHours = getTodayHoursText(restaurant);
    const msg = todayHours
      ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
      : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
    await sendBotReply(restaurant, customer, conversation, msg);
    return;
  }

  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Cart is empty! Send *menu* to add items.');
    return;
  }

  // Prevent duplicate orders from stale button clicks
  if (await hasRecentOrder(restaurant.id, customer.id)) {
    await sendBotReply(restaurant, customer, conversation, '⚠️ You already placed an order just now! Send *orders* to check your order status.');
    return;
  }

  const orderId = await convertCartToOrder(cart, 'delivery', undefined, undefined, 'cod');
  await updateCustomerOrderStats(customer.id, cart.total);

  const totalRupees = (cart.total / 100).toFixed(0);
  const estimatedTime = getEstimatedDeliveryTime(cart.items.length, 'delivery');
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const shortId = orderId.substring(0, 8).toUpperCase();

  const reply = [
    `✅ *Order Confirmed!*`,
    `━━━━━━━━━━━━━━`,
    `🏪 *${restaurant.name}*`,
    `🏷️ Order #${shortId}`,
    `📦 ${itemCount} item${itemCount > 1 ? 's' : ''}`,
    `💵 *₹${totalRupees}* — Cash on Delivery`,
    `⏱️ Ready in *${estimatedTime}*`,
    `━━━━━━━━━━━━━━`,
    `We're preparing your order! 👨‍🍳`,
    `Send *orders* to track your order.`,
  ].join('\n');

  await sendBotReply(restaurant, customer, conversation, reply);

  // Notify restaurant owner (fire-and-forget)
  notifyOwnerNewOrder(restaurant.id, orderId).catch(e => console.error('[Orchestrator] Owner notification failed (COD):', e));

  // Receipt will be sent when order is marked 'delivered'

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
  // Check if restaurant is open
  if (!isRestaurantOpen(restaurant)) {
    const todayHours = getTodayHoursText(restaurant);
    const msg = todayHours
      ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
      : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
    await sendBotReply(restaurant, customer, conversation, msg);
    return;
  }

  const cart = await getOrCreateCart(restaurant.id, customer.id);
  if (cart.items.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '🛒 Cart is empty! Send *menu* to add items.');
    return;
  }

  // Prevent duplicate orders from stale button clicks
  if (await hasRecentOrder(restaurant.id, customer.id)) {
    await sendBotReply(restaurant, customer, conversation, '⚠️ You already placed an order just now! Send *orders* to check your order status.');
    return;
  }

  const totalRupees = (cart.total / 100).toFixed(0);
  const estimatedTime = getEstimatedDeliveryTime(cart.items.length, 'delivery');
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const refId = cart.id.substring(0, 8).toUpperCase();

  // Generate Cashfree payment link using cart session
  const paymentLink = await createBotPaymentLink(
    restaurant.id,
    cart.id,
    customer.phone,
    customer.name || 'Customer',
    cart.total,
    true
  );

  let reply: string;
  if (paymentLink) {
    reply = [
      `🛒 *Order Summary*`,
      `━━━━━━━━━━━━━━`,
      `🏪 *${restaurant.name}*`,
      `🏷️ Ref #${refId}`,
      `📦 ${itemCount} item${itemCount > 1 ? 's' : ''}`,
      `💳 *₹${totalRupees}* — Pay Online`,
      `⏱️ Est. Delivery: *${estimatedTime}*`,
      `━━━━━━━━━━━━━━`,
      `👉 *Pay here to place your order:* ${paymentLink}`,
      ``,
      `⚠️ *Note:* Your order will *not* be created until the payment is completed successfully!`,
    ].join('\n');
  } else {
    reply = [
      `⚠️ *Payment Link Error*`,
      `━━━━━━━━━━━━━━`,
      `🏪 *${restaurant.name}*`,
      `💰 *₹${totalRupees}*`,
      `━━━━━━━━━━━━━━`,
      `We couldn't generate a payment link at the moment.`,
      `Please reply with *COD* to place a Cash on Delivery order instead!`,
    ].join('\n');
  }

  await sendBotReply(restaurant, customer, conversation, reply);

  // Receipt will be sent when order is marked 'delivered'

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'customer',
    actorId: customer.id,
    action: ACTIONS.ORDER_PLACED,
    details: { cartId: cart.id, totalAmount: cart.total, paymentMethod: 'online', paymentLink, estimatedTime },
  });
}

// ─── AI Response Generation ─────────────────

async function generateAndSendAIResponse(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string; loyalty_tier: string; total_orders: number },
  conversation: { id: string; context: Record<string, unknown> },
  userMessage: string
): Promise<void> {
  // ── Plan limit check: AI responses ──
  const aiCheck = await checkAiLimit(restaurant.id);
  if (!aiCheck.allowed) {
    await sendBotReply(restaurant, customer, conversation,
      '⚠️ We\'ve reached our AI response limit for this month. Please contact the restaurant directly for assistance.');
    return;
  }

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
    maxOutputTokens: 256,
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

  // Log AI usage (fire-and-forget)
  logAiUsage(restaurant.id, customer.id).catch(() => {});

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

  const isOpen = isRestaurantOpen(restaurant);
  const todayHours = getTodayHoursText(restaurant);
  const statusInstruction = !isOpen
    ? `\n\n## CURRENT STATUS: CLOSED\nWe are currently closed/not available. Our operating hours for today are ${todayHours || 'not set (we are closed)'}. Do NOT let the customer order or checkout. If they try to add items to cart, order, or checkout, politely apologize and say "We are not available right now. We are open from ${todayHours || 'our scheduled timings'} today."`
    : `\n\n## CURRENT STATUS: OPEN\nWe are open and taking orders. Our operating hours for today are ${todayHours || 'all day'}.`;

  return `${restaurant.ai_persona || ''}
${statusInstruction}

You are the premium AI concierge for "${restaurant.name}" on WhatsApp. You provide a world-class ordering experience.
${restaurant.address ? `
## RESTAURANT INFO:
Address: ${restaurant.address}
If customers ask where the restaurant is located, share this address.` : ''}

## YOUR PERSONALITY:
- Professional yet warm. Like a 5-star restaurant host.
- MAXIMUM 2 lines per response. Never exceed 3 lines. No paragraphs. No walls of text.
- Use bold (*text*) for item names and totals only. Use 1 emoji per message max.
- Speak naturally. Never say "I am an AI" or "as an AI assistant".
- Never use double line breaks. Use single \\n only.
- Do NOT list multiple items unprompted. Suggest one thing at a time.
${langInstruction}

## STRICT RULES:
1. ALL prices are in ₹ (Indian Rupees). Menu prices are in paise — ALWAYS divide by 100 when showing to customer.
2. NEVER invent menu items. Only recommend what's in the MENU section below.
3. If customer asks for something not on the menu, say "That's not on our menu right now" and suggest ONE similar item.
4. For complaints or complex issues, say: "Let me connect you with our team — type *agent*"
5. Minimum order: ₹${(restaurant.min_order_amount / 100).toFixed(0)}
6. Keep responses conversational. Never use bullet points or numbered lists.

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
      sendComboSuggestions(restaurant, customer, conversation, action.itemId).catch(e => console.error('[Orchestrator] Combo suggestion failed:', e));
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

  const reply = "Connecting you with our team now 🙏\nThey'll respond shortly — feel free to describe your query.";
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
    await sendBotReply(restaurant, customer, conversation, '🔍 Type *search [item name]* to find items.\nExample: *search paneer*');
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

  const bodyText = `🔍 ${results.length} result${results.length > 1 ? 's' : ''} for *"${query}"*\nTap to view details and add to cart.`;

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
      await sendBotReply(restaurant, customer, conversation, `🔍 Results for "${query}":\n${textResults}\nWhich one would you like?`);
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
    await sendBotReply(restaurant, customer, conversation, '📦 No order history yet!\nSend *menu* to place your first order 🎉');
    return;
  }

  const orderLines = orders.map((o, idx) => {
    const date = new Date(o.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const total = ((o.total as number) / 100).toFixed(0);
    const status = (o.status as string || 'unknown').toUpperCase();
    const rating = o.rating ? `⭐${o.rating}` : '';
    const items = (o.items as Array<Record<string, unknown>> || []).map((i) => i.item_name).join(', ');
    return `${idx + 1}. *#${o.order_number || 'N/A'}* — ${date}\n   ₹${total} · ${status} ${rating}\n   ${items.substring(0, 60)}`;
  }).join('\n');

  const bodyText = `📦 *Recent Orders*\n${orderLines}\n💡 Send *reorder* to repeat your last order!`;

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
  // Check if restaurant is open
  if (!isRestaurantOpen(restaurant)) {
    const todayHours = getTodayHoursText(restaurant);
    const msg = todayHours
      ? `🕐 *We are not available right now.*\nOur operating hours for today are *${todayHours}*.\nYou can still browse the menu and add items to your cart!`
      : `🕐 *Sorry, we are not available right now.*\nYou can still browse the menu and add items to your cart!`;
    await sendBotReply(restaurant, customer, conversation, msg);
    return;
  }

  const orders = await getCustomerOrders(customer.id, 1);

  if (orders.length === 0) {
    await sendBotReply(restaurant, customer, conversation, '📦 No previous orders found.\nSend *menu* to place your first order!');
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

  const bodyText = `🔄 *Reorder Ready!*\n${addedCount} item${addedCount > 1 ? 's' : ''} from your last order added to cart.\nReview or checkout below!`;

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

  const bodyText = `🎉 *Order delivered!*\nHow was your experience? Tap to rate below.`;

  try {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customerPhone,
      bodyText,
      buttons: [
        { id: `rate_5_${orderId}`, title: '⭐⭐⭐⭐⭐' },
        { id: `rate_3_${orderId}`, title: '⭐⭐⭐' },
        { id: `rate_1_${orderId}`, title: '⭐' },
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
        text: `🧾 *Your Receipt*\nDownload here: ${receiptUrl}\nThank you! 🙏`,
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
    // 1. Check for pre-configured combo deals from the combos table
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();
    const { data: combos } = await supabaseAdmin
      .from('combos')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('display_order', { ascending: true })
      .limit(3);

    // Check if any combo contains the just-added item
    const relevantCombos = (combos || []).filter((combo) => {
      const items = (combo.combo_items as Array<Record<string, unknown>>) || [];
      return items.some((ci) => ci.item_id === justAddedItemId);
    });

    // If relevant combos found, suggest them
    const combosToShow = relevantCombos.length > 0 ? relevantCombos : (combos || []).slice(0, 2);

    if (combosToShow.length > 0) {
      const comboLines = combosToShow.map((c) => {
        const originalRupees = ((c.original_price as number) / 100).toFixed(0);
        const comboRupees = ((c.combo_price as number) / 100).toFixed(0);
        const savings = (((c.original_price as number) - (c.combo_price as number)) / 100).toFixed(0);
        return `🔥 *${c.name}* — ₹${comboRupees} ~~₹${originalRupees}~~ (Save ₹${savings})\n   ${c.description || ''}`;
      }).join('\n');

      await sendBotReply(restaurant, customer, conversation,
        `🎯 *Combo Deals!*\n${comboLines}\nType the combo name to add it!`
      );
      return;
    }

    // 2. Fallback: Heuristic-based suggestions (drinks → bestsellers from other categories)
    const menu = await getFullMenu(restaurant.id);
    if (!menu) return;

    const addedItem = menu.categories
      .flatMap(c => c.items)
      .find(i => i.id === justAddedItemId);
    if (!addedItem) return;

    const addedCategoryId = addedItem.category_id;

    // Check if drinks/beverages category exists
    const drinkCategory = menu.categories.find(c =>
      c.name.toLowerCase().includes('drink') ||
      c.name.toLowerCase().includes('beverage') ||
      c.name.toLowerCase().includes('shake') ||
      c.name.toLowerCase().includes('lassi') ||
      c.name.toLowerCase().includes('juice')
    );

    // Get suggestions: drinks first, then bestsellers from other categories
    const suggestions = drinkCategory
      ? drinkCategory.items.filter(i => i.is_available).slice(0, 3)
      : menu.categories
          .filter(c => c.id !== addedCategoryId)
          .flatMap(c => c.items)
          .filter(i => i.is_available && i.is_bestseller)
          .slice(0, 3);

    if (suggestions.length === 0) return;

    const suggestionText = suggestions
      .map(s => `• ${s.name} — ₹${(s.price / 100).toFixed(0)}${s.is_bestseller ? ' ⭐' : ''}`)
      .join('\n');

    await sendBotReply(restaurant, customer, conversation,
      `💡 *Goes great with your order:*\n${suggestionText}\nType the item name to add!`
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

// ─── Operating Hours Helpers ────────────────

function getISTDate(): Date {
  // Convert UTC to IST (Asia/Kolkata, UTC+5:30) for accurate business hours check
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

function isRestaurantOpen(restaurant: Restaurant): boolean {
  const hours = restaurant.business_hours;
  if (!hours || Object.keys(hours).length === 0) return true; // No hours configured = always open

  const now = getISTDate();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const todayShort = today.substring(0, 3);
  const todayHours = (hours[today] || hours[todayShort]) as { open?: string; close?: string; closed?: boolean; is_closed?: boolean } | undefined;

  if (!todayHours) return true;
  if (todayHours.closed || todayHours.is_closed) return false;
  if (!todayHours.open || !todayHours.close) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = todayHours.open.split(':').map(Number);
  const [closeH, closeM] = todayHours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle overnight hours (e.g., 18:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function getBusinessHoursText(restaurant: Restaurant): string {
  const hours = restaurant.business_hours;
  if (!hours || Object.keys(hours).length === 0) return '';

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

  const lines: string[] = [];
  for (const day of days) {
    const dayShort = day.substring(0, 3);
    const h = (hours[day] || hours[dayShort]) as { open?: string; close?: string; closed?: boolean; is_closed?: boolean } | undefined;
    if (!h) continue;
    if (h.closed || h.is_closed) {
      lines.push(`${dayLabels[day]}: Closed`);
    } else if (h.open && h.close) {
      lines.push(`${dayLabels[day]}: ${h.open} - ${h.close}`);
    }
  }
  return lines.length > 0 ? `📅 *Our Hours:*\n${lines.join('\n')}` : '';
}

function getTodayHoursText(restaurant: Restaurant): string {
  const hours = restaurant.business_hours;
  if (!hours || Object.keys(hours).length === 0) return '';

  const now = getISTDate();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const todayShort = today.substring(0, 3);
  const todayHours = (hours[today] || hours[todayShort]) as { open?: string; close?: string; closed?: boolean; is_closed?: boolean } | undefined;

  if (!todayHours || todayHours.closed || todayHours.is_closed) return '';
  if (todayHours.open && todayHours.close) {
    return `${todayHours.open} to ${todayHours.close}`;
  }
  return '';
}
