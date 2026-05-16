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
import { sendTextMessage } from '@/lib/whatsapp/client';
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
  await saveMessage(conversation.id, restaurant.id, 'customer', incomingText, messageId);

  // 4. Check if bot is active (might be in human handoff mode)
  if (!conversation.is_bot_active) {
    console.log(`[Orchestrator] Bot inactive for conversation ${conversation.id}, skipping`);
    return; // Human agent is handling
  }

  // 5. Handle interactive button/list replies as text input
  if (interactiveReply) {
    // Treat the interactive reply title as user text for the AI
    await generateAndSendAIResponse(restaurant, customer, conversation, interactiveReply.title);
    return;
  }

  // 6. Handle special commands
  const lowerText = (text || '').toLowerCase().trim();
  if (lowerText === 'menu' || lowerText === 'hi' || lowerText === 'hello') {
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
  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendTextMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      text: reply,
    });
  }

  // Save bot response
  await saveMessage(conversation.id, restaurant.id, 'bot', reply);

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
  return `${restaurant.ai_persona}

You are the AI ordering assistant for "${restaurant.name}" on WhatsApp.

## RULES:
1. Be friendly, helpful, and concise. Use emojis sparingly.
2. Help customers browse the menu, add items to cart, and place orders.
3. Always mention prices in ₹ (Indian Rupees).
4. If asked about something NOT on the menu, politely redirect.
5. For complex requests or complaints, suggest typing "agent" for human help.
6. Minimum order amount: ₹${(restaurant.min_order_amount / 100).toFixed(0)}
7. Average preparation time: ${restaurant.avg_prep_time_min} minutes
8. NEVER make up items that aren't on the menu.

## CUSTOMER INFO:
- Name: ${customer.name || 'Customer'}
- Loyalty Tier: ${customer.loyalty_tier} (${customer.total_orders} orders)

## CURRENT CART:
${cartContext}

## MENU:
${menuContext}

## ACTIONS (include in your response when needed):
- To add item: [ADD_TO_CART:item_id:quantity]
- To remove item: [REMOVE_FROM_CART:item_id]
- To clear cart: [CLEAR_CART]
- To place order: [PLACE_ORDER]

Only use actions when the customer explicitly asks. Always confirm before placing orders.`;
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
        unit_price: item.base_price,
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
      const cart = await getOrCreateCart(restaurantId, customerId);
      if (cart.items.length === 0) return;

      const orderId = await convertCartToOrder(cart);
      await updateCustomerOrderStats(customerId, cart.total_amount);

      logActivity({
        restaurantId,
        actorType: 'customer',
        actorId: customerId,
        action: ACTIONS.ORDER_PLACED,
        details: { orderId, totalAmount: cart.total_amount },
      });
      break;
    }
  }
}

// ─── Menu Overview ──────────────────────────

async function sendMenuOverview(
  restaurant: Restaurant,
  customer: { id: string; phone: string; name?: string },
  conversation: { id: string }
): Promise<void> {
  const menu = await getFullMenu(restaurant.id);

  if (!menu || menu.categories.length === 0) {
    const reply = `Welcome to ${restaurant.name}! 🌿\n\nOur menu is being set up. Please check back soon!`;
    if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
      await sendTextMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customer.phone,
        text: reply,
      });
    }
    await saveMessage(conversation.id, restaurant.id, 'bot', reply);
    return;
  }

  // Send welcome + category list
  const greeting = customer.name ? `Hi ${customer.name}! 👋` : 'Welcome! 👋';
  const reply = `${greeting} Welcome to *${restaurant.name}*! 🌿\n\nHere's what we have today:\n\n${menu.categories
    .map((c, i) => `${i + 1}. 📂 *${c.name}* (${c.items.length} items)`)
    .join('\n')}\n\nJust tell me what you'd like to order, or type a dish name to search! 😋`;

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendTextMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      text: reply,
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', reply);
}

// ─── Cart Summary ───────────────────────────

async function sendCartSummary(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  const cart = await getOrCreateCart(restaurant.id, customer.id);
  const cartText = formatCartForWhatsApp(cart);

  let reply = cartText;
  if (cart.items.length > 0) {
    reply += '\n\nReply "place order" to checkout or keep adding items!';
  }

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendTextMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      text: reply,
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', reply);
}

// ─── Human Handoff ──────────────────────────

async function handleHumanHandoff(
  restaurant: Restaurant,
  customer: { id: string; phone: string },
  conversation: { id: string }
): Promise<void> {
  // Deactivate bot for this conversation
  await setBotActive(conversation.id, false);

  const reply = "I'm connecting you with a team member right now. They'll respond shortly! 🙏\n\nIn the meantime, feel free to describe your query.";

  if (restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    await sendTextMessage({
      phoneNumberId: restaurant.whatsapp_phone_id,
      accessToken: restaurant.whatsapp_token,
      to: customer.phone,
      text: reply,
    });
  }
  await saveMessage(conversation.id, restaurant.id, 'bot', reply);

  logActivity({
    restaurantId: restaurant.id,
    actorType: 'bot',
    action: ACTIONS.BOT_HANDOFF,
    details: { customerPhone: customer.phone, conversationId: conversation.id },
  });
}
