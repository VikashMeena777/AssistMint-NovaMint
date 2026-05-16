// ============================================
// AssistMint — Restaurant Server Actions
// Onboarding + Settings CRUD
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Current Restaurant ─────────────────

export async function getCurrentRestaurant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  return data as Record<string, unknown> | null;
}

// ─── Create Restaurant (Onboarding) ─────────

export async function createRestaurant(formData: {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  description?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', formData.slug)
    .single();

  if (existing) {
    return { error: 'This slug is already taken. Choose a different one.' };
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: formData.name,
      slug: formData.slug,
      phone: formData.phone || null,
      address: formData.address || null,
      cuisine_type: formData.cuisine || null,
      description: formData.description || null,
      is_active: true,
      plan: 'starter',
      supported_languages: ['en'],
      ai_persona: `You are a friendly ordering assistant for ${formData.name}. Help customers browse the menu, add items to cart, and place orders. Be warm, concise, and use emojis sparingly.`,
      business_hours: {
        mon: { open: '10:00', close: '22:00' },
        tue: { open: '10:00', close: '22:00' },
        wed: { open: '10:00', close: '22:00' },
        thu: { open: '10:00', close: '22:00' },
        fri: { open: '10:00', close: '23:00' },
        sat: { open: '10:00', close: '23:00' },
        sun: { open: '10:00', close: '22:00' },
      },
      min_order_amount: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity({
    restaurantId: (data as Record<string, unknown>).id as string,
    actorType: 'owner',
    actorId: user.id,
    action: 'restaurant.created',
    details: { name: formData.name, slug: formData.slug },
  });

  revalidatePath('/dashboard');
  return { data };
}

// ─── Update Restaurant Settings ─────────────

export async function updateRestaurantSettings(
  restaurantId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { error: 'Not authorized to update this restaurant' };
  }

  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId);

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.SETTINGS_UPDATED,
    details: { updatedKeys: Object.keys(updates) },
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ─── Update WhatsApp Config ─────────────────

export async function updateWhatsAppConfig(
  restaurantId: string,
  config: {
    whatsapp_phone_id: string;
    whatsapp_token: string;
    whatsapp_business_id?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('restaurants')
    .update({
      whatsapp_phone_id: config.whatsapp_phone_id,
      whatsapp_access_token: config.whatsapp_token,
      whatsapp_waba_id: config.whatsapp_business_id || null,
    })
    .eq('id', restaurantId)
    .eq('owner_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ─── Update AI Persona ──────────────────────

export async function updateAIPersona(
  restaurantId: string,
  persona: string
) {
  return updateRestaurantSettings(restaurantId, { ai_persona: persona });
}

// ─── Update Business Hours ──────────────────

export async function updateBusinessHours(
  restaurantId: string,
  hours: Record<string, { open: string; close: string }>
) {
  return updateRestaurantSettings(restaurantId, { business_hours: hours });
}
