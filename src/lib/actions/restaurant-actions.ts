// ============================================
// AssistMint — Restaurant Server Actions
// Onboarding + Settings CRUD
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Current Restaurant ─────────────────

// Per-request memoization: several server components/actions in one render
// share a single Supabase round trip instead of one each.
const getCurrentRestaurantCached = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  return data as Record<string, unknown> | null;
});

export async function getCurrentRestaurant() {
  return getCurrentRestaurantCached();
}

// ─── Create Restaurant (Onboarding) ─────────

export async function createRestaurant(formData: {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  description?: string;
  business_type?: string;
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

  const businessType = formData.business_type || 'food_beverage';

  // Dynamic persona based on business type
  const personaMap: Record<string, string> = {
    food_beverage: `You are a friendly ordering assistant for ${formData.name}. Help customers browse the menu, add items to cart, and place orders. Be warm, concise, and use emojis sparingly.`,
    salon_spa: `You are a friendly booking assistant for ${formData.name}. Help clients browse services, book appointments, and manage their bookings. Be warm, concise, and professional.`,
    healthcare: `You are a helpful clinic assistant for ${formData.name}. Help patients find doctors, book appointments, and get information about services. Be professional and empathetic.`,
    education: `You are a helpful education counselor for ${formData.name}. Help students explore courses, check fees, and book demo classes. Be informative and encouraging.`,
    retail: `You are a friendly shop assistant for ${formData.name}. Help customers browse products, check availability, and place orders. Be helpful and concise.`,
    services: `You are a helpful service booking assistant for ${formData.name}. Help customers find the right service, book appointments, and get pricing information. Be professional.`,
  };

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
      plan: 'free',
      supported_languages: ['en'],
      business_type: businessType,
      ai_persona: personaMap[businessType] || personaMap.food_beverage,
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

// Fields the owner is allowed to change via the dashboard.
// NEVER add plan/billing/credential columns here — those are set only by
// the payment webhook, the plan-expiry cron, or dedicated admin actions.
const SETTINGS_ALLOWED_FIELDS = new Set([
  'name', 'description', 'phone', 'address', 'city', 'state', 'pincode',
  'cuisine_type', 'ai_persona', 'business_hours', 'delivery_zones',
  'delivery_fee_rules', 'min_order_amount', 'currency', 'language',
  'supported_languages', 'gst_number', 'tax_rate', 'tax_inclusive_pricing',
  'business_type', 'delivery_enabled', 'pickup_enabled', 'business_config',
  'logo_url', 'cover_image_url', 'google_review_url',
  'owner_whatsapp', 'notification_email',
  'notify_new_order', 'notify_payment', 'notify_human_handoff', 'notify_daily_summary',
]);

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

  // Allowlist: silently drop anything the owner must not set directly
  // (plan, plan_expires_at, trial_used, owner_id, cashfree_*, whatsapp_*, is_active, ...)
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (SETTINGS_ALLOWED_FIELDS.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) {
    return { error: 'No valid fields to update' };
  }

  const { error } = await supabase
    .from('restaurants')
    .update(safeUpdates)
    .eq('id', restaurantId);

  if (error) return { error: error.message };

  // Keep the Meta display name in sync with the restaurant name: when the
  // owner renames the business AND WhatsApp is connected, request the display
  // name change (Meta verifies it; the phone_number_name_update webhook then
  // auto-re-registers the number once approved). Fire-and-forget — the save
  // never blocks or fails on this.
  if (typeof safeUpdates.name === 'string' && safeUpdates.name.trim()) {
    void (async () => {
      try {
        const { data: full } = await supabase
          .from('restaurants')
          .select('name, whatsapp_phone_id, whatsapp_access_token')
          .eq('id', restaurantId)
          .single();
        const r = full as Record<string, string> | null;
        if (!r?.whatsapp_phone_id || !r?.whatsapp_access_token) return; // not connected

        const { getDisplayNameStatus, requestDisplayNameChange } = await import(
          '@/lib/whatsapp/display-name'
        );
        const status = await getDisplayNameStatus({
          phoneNumberId: r.whatsapp_phone_id,
          accessToken: r.whatsapp_access_token,
        });
        // Only request when actually different from the current (and pending) name
        const target = r.name.trim();
        if (status.verified_name !== target && status.new_display_name !== target) {
          await requestDisplayNameChange({
            phoneNumberId: r.whatsapp_phone_id,
            accessToken: r.whatsapp_access_token,
            newName: target,
          });
          logActivity({
            restaurantId,
            actorType: 'owner',
            actorId: user.id,
            action: 'whatsapp.display_name_change_requested',
            details: { new_name: target },
          });
        }
      } catch (err) {
        console.warn('[RestaurantActions] Display name sync skipped:', err);
      }
    })();
  }

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

// ─── Setup WhatsApp Ice Breakers ────────────

export async function setupWhatsAppIceBreakers(restaurantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('whatsapp_phone_id, whatsapp_waba_id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!restaurant) return { error: 'Restaurant not found' };

  const r = restaurant as Record<string, unknown>;
  const wabaId = r.whatsapp_waba_id as string;

  // Ice breakers must be configured in Meta WhatsApp Manager (no API support)
  return {
    success: true,
    instructions: true,
    managerUrl: wabaId
      ? `https://business.facebook.com/wa/manage/phone-numbers/?waba_id=${wabaId}`
      : 'https://business.facebook.com/wa/manage/phone-numbers/',
    steps: [
      'Open WhatsApp Manager (link above)',
      'Select your phone number → Settings (gear icon)',
      'Go to "Automations" tab',
      'Find "Ice Breakers" → click Edit',
      'Add: Browse Menu, View Cart, Track Order, Talk to Us',
      'Save changes',
    ],
  };
}

// ─── Start Starter Plan 14-Day Trial ────────

export async function startStarterTrial(restaurantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership + check current plan
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, plan, trial_used')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { error: 'Not authorized' };
  }

  const r = restaurant as Record<string, unknown>;

  // Prevent re-trials
  if (r.trial_used) {
    return { error: 'You have already used your free trial.' };
  }

  // If already on a paid plan, skip
  if (r.plan !== 'free') {
    return { error: 'You are already on a paid plan.' };
  }

  // Set plan to starter with 14-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const { error } = await supabase
    .from('restaurants')
    .update({
      plan: 'starter',
      plan_expires_at: expiresAt.toISOString(),
      trial_used: true,
    })
    .eq('id', restaurantId);

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: 'plan.trial_started',
    details: { plan: 'starter', expires_at: expiresAt.toISOString() },
  });

  revalidatePath('/dashboard/settings');
  return { success: true, expiresAt: expiresAt.toISOString() };
}

// ─── Update Restaurant Payment Config (Cashfree Option A) ───

export async function updateRestaurantPaymentConfig(
  restaurantId: string,
  config: {
    cashfree_client_id: string;
    cashfree_client_secret: string;
    cashfree_webhook_secret?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership and get existing keys
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, cashfree_client_secret, cashfree_webhook_secret')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { error: 'Not authorized to update this restaurant' };
  }

  const r = restaurant as { cashfree_client_secret: string | null; cashfree_webhook_secret: string | null };

  // Mask protection: if the user didn't change the masked secret, preserve the database value
  let finalClientSecret = config.cashfree_client_secret;
  if (finalClientSecret === '••••••••••••••••••••••••••••••••') {
    finalClientSecret = r.cashfree_client_secret || '';
  }

  let finalWebhookSecret = config.cashfree_webhook_secret;
  if (finalWebhookSecret === '••••••••••••••••••••••••••••••••') {
    finalWebhookSecret = r.cashfree_webhook_secret || '';
  }

  const { error } = await supabase
    .from('restaurants')
    .update({
      cashfree_client_id: config.cashfree_client_id || null,
      cashfree_client_secret: finalClientSecret || null,
      cashfree_webhook_secret: finalWebhookSecret || null,
    })
    .eq('id', restaurantId);

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.SETTINGS_UPDATED,
    details: { updatedKeys: ['cashfree_client_id', 'cashfree_client_secret', 'cashfree_webhook_secret'] },
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ─── Get Restaurant Payment Config (Masked Securely) ───────

export async function getRestaurantPaymentConfig(restaurantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, cashfree_client_id, cashfree_client_secret, cashfree_webhook_secret')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || (restaurant as Record<string, unknown>).owner_id !== user.id) {
    return { error: 'Not authorized' };
  }

  const r = restaurant as { cashfree_client_id: string | null; cashfree_client_secret: string | null; cashfree_webhook_secret: string | null };
  return {
    success: true,
    cashfree_client_id: r.cashfree_client_id || '',
    cashfree_client_secret: r.cashfree_client_secret ? '••••••••••••••••••••••••••••••••' : '',
    cashfree_webhook_secret: r.cashfree_webhook_secret ? '••••••••••••••••••••••••••••••••' : '',
  };
}

// ─── In-Chat UPI (business_config.upi_vpa) ─────────

/** Shape of a UPI ID (virtual payment address), e.g. vikash@okhdfcbank. */
const UPI_ID_PATTERN = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * Save (or clear) the business's UPI ID — the one setting behind the
 * in-chat "Pay Online" invoices the bot sends (see the orchestrator's
 * handleOnlinePayOrder). Stored in business_config.upi_vpa via the
 * allowlisted updateRestaurantSettings, always as a merge so the rest of
 * business_config is never clobbered. Passing an empty string clears it.
 */
export async function saveUpiVpa(
  restaurantId: string,
  upiVpa: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify ownership + read the CURRENT business_config (fresh, so we merge
  // against what is actually in the DB rather than a stale client copy).
  // Retry: Supabase REST intermittently gateway-times-out (seen live) — a
  // single retry clears the transient instead of failing the save.
  let restaurant: { owner_id: string; business_config: Record<string, unknown> | null } | null = null;
  let readError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await supabase
      .from('restaurants')
      .select('owner_id, business_config')
      .eq('id', restaurantId)
      .single();
    if (!result.error) {
      restaurant = result.data as { owner_id: string; business_config: Record<string, unknown> | null };
      readError = null;
      break;
    }
    readError = result.error.message;
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  if (readError) {
    return { success: false, error: `Could not reach the database — please try again. (${readError})` };
  }

  if (!restaurant || restaurant.owner_id !== user.id) {
    return { success: false, error: 'Not authorized to update this restaurant' };
  }

  const current =
    restaurant.business_config && typeof restaurant.business_config === 'object' && !Array.isArray(restaurant.business_config)
      ? restaurant.business_config
      : {};

  const clean = (upiVpa || '').trim();
  if (clean && !UPI_ID_PATTERN.test(clean)) {
    return {
      success: false,
      error: 'That doesn\u2019t look like a UPI ID — it should look like yourname@bank (e.g. vikash@okhdfcbank).',
    };
  }

  // Merge — never clobber the rest of business_config
  const result = await updateRestaurantSettings(restaurantId, {
    business_config: { ...current, upi_vpa: clean || null },
  });
  if (result && 'error' in result && result.error) {
    return { success: false, error: result.error };
  }
  return { success: true, error: null };
}
