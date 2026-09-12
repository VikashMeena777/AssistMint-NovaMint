// ============================================
// AssistMint — Conversation Manager
// Manages conversation messages using the
// conversations table (message log) schema
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface Conversation {
  id: string;
  restaurant_id: string;
  customer_id: string;
  phone: string;
  is_bot_active: boolean;
  context: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// System markers are administrative rows (handoff/reactivation) that must
// never leak into AI context.
function isSystemMarker(content: string): boolean {
  return typeof content === 'string' && content.startsWith('[System]');
}

// ─── Get or Create Conversation ─────────────
// The DB "conversations" table is a message log (role + content per row).
// We simulate a "session" by returning a virtual conversation object
// based on the restaurant + customer combo.
//
// Bot-active state = the LATEST marker row (requires_human IS NOT NULL)
// for this phone: requires_human=true → human took over; false → bot back.

export async function getOrCreateConversation(
  restaurantId: string,
  customerId: string,
  phone: string
): Promise<Conversation> {
  const { data: marker } = await supabaseAdmin
    .from('conversations')
    .select('requires_human')
    .eq('restaurant_id', restaurantId)
    .eq('customer_phone', phone)
    .not('requires_human', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isBotActive = !marker || marker.requires_human === false;

  // Return a virtual conversation session
  return {
    id: `${restaurantId}:${customerId}`,
    restaurant_id: restaurantId,
    customer_id: customerId,
    phone,
    is_bot_active: isBotActive,
    context: {},
  };
}

// ─── Get Recent Messages (for AI context) ───

export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<Message[]> {
  // conversationId is "restaurantId:customerId"
  const parts = conversationId.split(':');
  if (parts.length < 2) return [];

  const restaurantId = parts[0];
  const customerId = parts[1];

  // Scope to THIS customer — the previous restaurant-wide query leaked
  // other customers' messages (addresses, order contents) into the AI prompt.
  const { data: messages } = await supabaseAdmin
    .from('conversations')
    .select('role, content')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];

  // Reverse so oldest first (for AI context); drop system markers
  return (messages as Record<string, unknown>[])
    .reverse()
    .filter((msg) => !isSystemMarker((msg.content as string) || ''))
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: (msg.content as string) || '',
    }));
}

// ─── Save Message ───────────────────────────

export async function saveMessage(
  conversationId: string,
  restaurantId: string,
  senderType: 'customer' | 'bot' | 'agent',
  content: string,
  whatsappMessageId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // conversationId is "restaurantId:customerId"
  const parts = conversationId.split(':');
  const customerId = parts.length >= 2 ? parts[1] : undefined;

  // Map senderType to role for the conversations table
  const role = senderType === 'customer' ? 'user' : 'assistant';

  // Extract phone from metadata if available
  const phone = (metadata?.phone as string) || '';

  const row = {
    restaurant_id: restaurantId,
    customer_id: customerId || null,
    customer_phone: phone,
    role,
    content,
    message_type: 'text',
    whatsapp_message_id: whatsappMessageId,
    metadata: metadata || {},
  };

  // When a WhatsApp message id is present, upsert-ignore: Meta redeliveries
  // must not double-log (unique index conversations_whatsapp_msg_uniq).
  const { error } = whatsappMessageId
    ? await supabaseAdmin.from('conversations').upsert(row, {
        onConflict: 'whatsapp_message_id',
        ignoreDuplicates: true,
      })
    : await supabaseAdmin.from('conversations').insert(row);

  if (error) {
    console.error('[ConversationManager] Failed to save message:', error.message);
  }
}

// ─── Toggle Bot Active ──────────────────────

export async function setBotActive(
  conversationId: string,
  active: boolean,
  phone?: string
): Promise<void> {
  const parts = conversationId.split(':');
  if (parts.length < 2) return;

  const restaurantId = parts[0];
  const customerId = parts[1];

  // The handoff lookup keys on customer_phone — without it the marker could
  // never match and the bot would keep replying after handoff.
  let resolvedPhone = phone;
  if (!resolvedPhone) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('phone')
      .eq('id', customerId)
      .single();
    resolvedPhone = (customer as Record<string, string> | null)?.phone || '';
  }

  // Insert a marker row; the latest non-null requires_human row decides
  // bot state (see getOrCreateConversation). active=true reactivates the bot.
  const { error } = await supabaseAdmin.from('conversations').insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    customer_phone: resolvedPhone,
    role: 'assistant',
    content: active
      ? '[System] Bot reactivated'
      : '[System] Conversation handed off to human agent',
    message_type: 'text',
    requires_human: !active,
    metadata: { system: true },
  });

  if (error) {
    console.error('[ConversationManager] Failed to set bot active state:', error.message);
  }
}
