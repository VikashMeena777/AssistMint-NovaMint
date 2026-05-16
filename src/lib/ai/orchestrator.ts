// ============================================
// AssistMint — AI Ordering Orchestrator
// The brain: Routes WhatsApp messages through
// AI engine with menu context + cart tools
// ============================================

import { generateAIResponse } from '@/lib/ai/engine';
import { getFullMenu, buildMenuContext, getMenuItemById } from '@/lib/services/menu-service';
import { getOrCreateCart, addToCart, removeFromCart, clearCart, formatCartForWhatsApp, convertCartToOrder, type CartItem } from '@/lib/services/cart-engine';
import { getOrCreateCustomer, updateCustomerOrderStats } from '@/lib/services/customer-service';
import { getOrCreateConversation, getRecentMessages, saveMessage, setBotActive } from '@/lib/services/conversation-manager';
import { getRestaurantByPhoneId, type Restaurant } from '@/lib/services/restaurant-service';
import { createBotPaymentLink } from '@/lib/services/bot-payment';
import { sendTextMessage, sendReplyButtons, sendListMessage, type ListSection } from '@/lib/whatsapp/client';
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
}): Promise<void> {
  const { phoneNumberId, from, messageId, text, interactiveReply, whatsappName } = params;

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
  const incomingText = text || interactiveReply?.title || '(non-text)';
  await saveMessage(conversation.id, restaurant.id, 'customer', incomingText, messageId, { phone: from });

  // 4. Check if bot is active (might be in human handoff mode)
  if (!conversation.is_bot_active) {
    console.log(`[Orchestrator] Bot inactive for conversation ${conversation.id}, skipping`);
    return; // Human agent is handling
  }

  // 5. Handle interactive button/list replies by ID
  if (interactiveReply) {
    await handleInteractiveReply(restaurant, customer, conversation, interactiveReply);
    return;
  }

  // 6. Handle special commands
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey') {
    await sendGreeting(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'menu') {
    await sendMenuOverview(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'cart') {
    await sendCartSummary(restaurant, customer, conversation);
    return;
  }
  if (lowerText === 'agent' || lowerText === 'human') {
    await handleHumanHandoff(restaurant, customer, conversation);
    return;
  }

  // 7. AI-powered response
  await generateAndSendAIResponse(restaurant, customer, conversation, text || '');
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
      await sendPaymentChoice(restaurant, customer, conversation);
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

    default:
      // Handle dynamic IDs: item_uuid, add_uuid
      if (btnId.startsWith('item_')) {
        await sendItemDetails(restaurant, customer, conversation, btnId.replace('item_', ''));
      } else if (btnId.startsWith('add_')) {
        await handleDirectAddToCart(restaurant, customer, conversation, btnId.replace('add_', ''));
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
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  const greeting = customer.name ? `Hi ${customer.name}! 👋` : 'Hi there! 👋';
  const bodyText = `${greeting}\n\nWelcome to *${restaurant.name}*! 🌿\n\nI'm your AI assistant — I can help you browse our menu, take your order, and more!\n\nWhat would you like to do?`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText,
      buttons: [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_cart', title: '🛒 My Cart' },
        { id: 'btn_help', title: '💬 Help' },
      ],
    });
  }

  await saveMessage(conversation.id, restaurant.id, 'bot', bodyText, undefined, { phone: customer.phone });
}

// ─── Menu Overview (Interactive List) ───────

async function sendMenuOverview(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  const menu = await getFullMenu(restaurant.id);

  if (!menu || menu.categories.length === 0) {
    await sendBotReply(restaurant, customer, conversation,
      `Welcome to ${restaurant.name}! 🌿\n\nOur menu is being set up. Please check back soon!`);
    return;
  }

  // Build interactive list sections from menu categories
  const sections: ListSection[] = menu.categories.slice(0, 10).map((cat) => ({
    title: cat.name.substring(0, 24),
    rows: cat.items.slice(0, 10).map((item) => ({
      id: `item_${item.id}`,
      title: item.name.substring(0, 24),
      description: `₹${(item.price / 100).toFixed(0)}${item.is_veg ? ' 🟢' : ' 🔴'}`,
    })),
  }));

  const bodyText = `Here's our menu! 🍽️\n\nTap below to browse categories and items.\nJust tell me what you'd like to order!`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    try {
      await sendListMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        headerText: `${restaurant.name} Menu`,
        bodyText,
        footerText: 'Tap an item to learn more',
        buttonText: '📋 Browse Menu',
        sections,
      });
    } catch (e) {
      // Fallback to text if list message fails (e.g., too many items)
      console.warn('[Orchestrator] List message failed, falling back to text:', e);
      const textMenu = menu.categories
        .map((c) => `📂 *${c.name}*\n${c.items.map((i) => `  • ${i.name} — ₹${(i.price / 100).toFixed(0)}${i.is_veg ? ' 🟢' : ' 🔴'}`).join('\n')}`)
        .join('\n\n');

      await sendBotReply(restaurant, customer, conversation,
        `Here's our menu! 🍽️\n\n${textMenu}\n\nJust tell me what you'd like to order!`);
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
  const cartText = formatCartForWhatsApp(cart);

  if (cart.items.length > 0 && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendReplyButtons({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      bodyText: cartText,
      buttons: [
        { id: 'btn_place_order', title: '✅ Place Order' },
        { id: 'btn_clear_cart', title: '🗑 Clear Cart' },
        { id: 'btn_menu', title: '📋 Add More' },
      ],
    });
    await saveMessage(conversation.id, restaurant.id, 'bot', cartText, undefined, { phone: customer.phone });
  } else {
    await sendBotReply(restaurant, customer, conversation, cartText);
  }
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

  const totalRupees = (cart.total / 100).toFixed(0);
  const bodyText = `🧾 *Order Summary*\n\n${cart.items.map((i) => `• ${i.item_name} x${i.quantity}`).join('\n')}\n\n*Total: ₹${totalRupees}*\n\nHow would you like to pay?`;

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
  const reply = `🎉 *Order Placed!*\n\n💵 Payment: Cash on Delivery\n💰 Amount: ₹${totalRupees}\n\nYour order is being prepared! You'll pay ₹${totalRupees} when it arrives.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;

  await sendBotReply(restaurant, customer, conversation, reply);

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'customer',
    actorId: customer.id,
    action: ACTIONS.ORDER_PLACED,
    details: { orderId, totalAmount: cart.total, paymentMethod: 'cod' },
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
    reply = `🎉 *Order Placed!*\n\n💳 Payment: Online\n💰 Amount: ₹${totalRupees}\n\n👉 Pay securely here:\n${paymentLink}\n\nYour order will be confirmed once payment is received.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;
  } else {
    // Fallback if Cashfree isn't configured
    reply = `🎉 *Order Placed!*\n\n💰 Amount: ₹${totalRupees}\n\n⚠️ Online payment is being set up. Our team will contact you for payment.\n\nThank you for ordering from *${restaurant.name}*! 🌿`;
  }

  await sendBotReply(restaurant, customer, conversation, reply);

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'customer',
    actorId: customer.id,
    action: ACTIONS.ORDER_PLACED,
    details: { orderId, totalAmount: cart.total, paymentMethod: 'online', paymentLink },
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
    await executeAction(action, restaurant.id, customer.id, cart.id);
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
  customer: { name?: string; loyalty_tier: string; total_orders: number },
  menuContext: string,
  cartContext: string
): string {
  return `${restaurant.ai_persona || ''}

You are the premium AI concierge for "${restaurant.name}" on WhatsApp. You provide a world-class ordering experience.

## YOUR PERSONALITY:
- Professional yet warm. Like a 5-star restaurant host.
- Keep responses SHORT (2-4 lines max). No walls of text.
- Use bold (*text*) for emphasis. Use emojis tastefully (1-2 per message).
- Speak naturally. Never say "I am an AI" or "as an AI assistant".

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

⚠️ IMPORTANT:
- When customer says "add X" or "I want X", you MUST include the [ADD_TO_CART:id:qty] tag. Do NOT just say "I'll add it" without the tag.
- The item_id must be the exact UUID from the menu. Example: [ADD_TO_CART:a1b2c3d4-e5f6-7890-abcd-ef1234567890:1]
- NEVER say "I've added X to your cart" without actually including the [ADD_TO_CART] tag.
- If you can't find the exact item ID, ask the customer to clarify which item they want.
- For checkout, include [PLACE_ORDER] — the system will handle payment options.`;
}

// ─── Parse AI Response ──────────────────────

interface AIAction {
  type: 'add_to_cart' | 'remove_from_cart' | 'clear_cart' | 'place_order';
  itemId?: string;
  quantity?: number;
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

  return { reply: reply.trim(), actions };
}

// ─── Execute AI Action ──────────────────────

async function executeAction(
  action: AIAction,
  restaurantId: string,
  customerId: string,
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
