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

// ─── Get or Create Conversation ─────────────
// The DB "conversations" table is a message log (role + content per row).
// We simulate a "session" by returning a virtual conversation object
// based on the restaurant + customer combo.

export async function getOrCreateConversation(
  restaurantId: string,
  customerId: string,
  phone: string
): Promise<Conversation> {
  // Check if there's a recent message that was handed off to a human
  const { data: recentHandoff } = await supabaseAdmin
    .from('conversations')
    .select('requires_human, handed_off_to')
    .eq('restaurant_id', restaurantId)
    .eq('customer_phone', phone)
    .eq('requires_human', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const isBotActive = !recentHandoff;

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
  // Get the customer to find their phone
  const { data: messages } = await supabaseAdmin
    .from('conversations')
    .select('role, content')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];

  // Reverse so oldest first (for AI context)
  return (messages as Record<string, unknown>[])
    .reverse()
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

  const { error } = await supabaseAdmin.from('conversations').insert({
    restaurant_id: restaurantId,
    customer_id: customerId || null,
    customer_phone: phone,
    role,
    content,
    message_type: 'text',
    whatsapp_message_id: whatsappMessageId,
    metadata: metadata || {},
  });

  if (error) {
    console.error('[ConversationManager] Failed to save message:', error.message);
  }
}

// ─── Update Conversation Context ────────────

export async function updateConversationContext(
  _conversationId: string,
  _context: Record<string, unknown>
): Promise<void> {
  // Context is not stored in the DB schema — this is a no-op
  // In the future, could use metadata field on recent messages
}

// ─── Toggle Bot Active ──────────────────────

export async function setBotActive(
  conversationId: string,
  active: boolean
): Promise<void> {
  // Mark the most recent message for this conversation as requires_human
  const parts = conversationId.split(':');
  if (parts.length < 2) return;

  const restaurantId = parts[0];

  if (!active) {
    // Insert a handoff marker message
    await supabaseAdmin.from('conversations').insert({
      restaurant_id: restaurantId,
      customer_id: parts[1],
      customer_phone: '',
      role: 'assistant',
      content: '[System] Conversation handed off to human agent',
      message_type: 'text',
      requires_human: true,
    });
  }
}
