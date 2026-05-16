// ============================================
// AssistMint — Conversation Manager
// Manages conversation state + message history
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

// ─── Get or Create Conversation ─────────────

export async function getOrCreateConversation(
  restaurantId: string,
  customerId: string,
  phone: string
): Promise<Conversation> {
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const c = existing as Record<string, unknown>;
    return {
      id: c.id as string,
      restaurant_id: c.restaurant_id as string,
      customer_id: c.customer_id as string,
      phone: c.phone as string,
      is_bot_active: (c.is_bot_active as boolean) ?? true,
      context: (c.context as Record<string, unknown>) || {},
    };
  }

  const { data: newConvo } = await supabaseAdmin
    .from('conversations')
    .insert({
      restaurant_id: restaurantId,
      customer_id: customerId,
      phone,
      is_bot_active: true,
      context: {},
    })
    .select()
    .single();

  const c = newConvo as Record<string, unknown>;
  return {
    id: c.id as string,
    restaurant_id: restaurantId,
    customer_id: customerId,
    phone,
    is_bot_active: true,
    context: {},
  };
}

// ─── Get Recent Messages (for AI context) ───

export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<Message[]> {
  const { data } = await supabaseAdmin
    .from('messages')
    .select('sender_type, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Reverse so oldest first (for AI context)
  return (data as Record<string, unknown>[])
    .reverse()
    .map((msg) => ({
      role: msg.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
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
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    restaurant_id: restaurantId,
    sender_type: senderType,
    message_type: 'text',
    content,
    whatsapp_message_id: whatsappMessageId,
    metadata: metadata || {},
  });

  // Update conversation last_message_at
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

// ─── Update Conversation Context ────────────

export async function updateConversationContext(
  conversationId: string,
  context: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin
    .from('conversations')
    .update({ context })
    .eq('id', conversationId);
}

// ─── Toggle Bot Active ──────────────────────

export async function setBotActive(
  conversationId: string,
  active: boolean
): Promise<void> {
  await supabaseAdmin
    .from('conversations')
    .update({ is_bot_active: active })
    .eq('id', conversationId);
}
