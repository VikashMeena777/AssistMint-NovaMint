// ============================================
// AssistMint — Conversation Server Actions
// Tags for conversation sessions (the dashboard
// groups conversations.messages by customer phone)
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/utils/activity-logger';

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 24;

/**
 * Update the tags on a conversation session.
 *
 * A "conversation" in the dashboard is every message row sharing the same
 * (restaurant_id, customer_phone) — so tags are written to all rows of the
 * session, which keeps them visible no matter which message the list groups
 * by. Ownership is verified before any write.
 */
export async function updateConversationTags(
  restaurantId: string,
  conversationPhone: string,
  tags: string[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  const phone = (conversationPhone || '').trim();
  if (!phone) return { success: false, error: 'Missing conversation.' };

  // Sanitize: trim, cap length, dedupe (case-insensitive), cap count
  const clean: string[] = [];
  for (const raw of tags || []) {
    const tag = String(raw).trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    if (!clean.some((t) => t.toLowerCase() === tag.toLowerCase())) clean.push(tag);
    if (clean.length >= MAX_TAGS) break;
  }

  const { error } = await supabase
    .from('conversations')
    .update({ tags: clean })
    .eq('restaurant_id', restaurantId)
    .eq('customer_phone', phone);

  if (error) return { success: false, error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: 'conversation.tags_updated',
    details: { phone, tags: clean },
  });

  return { success: true, error: null };
}
