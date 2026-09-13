// ============================================
// AssistMint — WhatsApp Flows Response Handler
// Routing + persistence layer for endpoint-powered
// Flows. Two entry points:
//
//   handleFlowRequest(token, request) — used by the encrypted endpoint
//     (src/app/api/whatsapp/flows-endpoint/route.ts) to produce the next
//     screen / SUCCESS / error payload.
//
//   handleFlowResponse(tokenPayload, screenData) — used by the webhook
//     bridge (src/lib/flows/webhook-bridge.ts) when Meta delivers the
//     flow_response webhook after the flow completes.
//
// Both paths share idempotent persisters, so an outcome that was already
// persisted by the endpoint is not duplicated (and the customer is not
// double-texted) when the webhook fires for the same flow_token.
//
// Never throws — failures become encrypted error screens (Meta blocks
// endpoints on 5xx rates).
//
// NOTE on data accumulation: WhatsApp clients submit the current screen's
// form data with each data_exchange request, and — as in Meta's own
// multi-screen booking examples — values from earlier screens are included
// on later submissions. We read every field defensively and return a
// friendly error screen when a required value is missing.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { createAppointment, getAvailableSlots } from '@/lib/services/appointment-service';
import {
  addSavedAddress,
  getOrCreateCustomer,
  getSavedAddresses,
  saveOrderRating,
} from '@/lib/services/customer-service';
import { saveMessage } from '@/lib/services/conversation-manager';
import { getRestaurantById } from '@/lib/services/restaurant-service';
import { getMenuItemById } from '@/lib/services/menu-service';
import { sendTextMessage } from '@/lib/whatsapp/client';
import type { FlowEndpointRequest } from './encryption';
import type { FlowTokenPayload } from './token';
import {
  ADDRESS_SCREENS,
  APPOINTMENT_SCREENS,
  FEEDBACK_SCREENS,
  FLOW_FIRST_SCREEN,
  formatTimeLabel,
} from './definitions';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

/** Response payload the endpoint encrypts and returns to the WhatsApp client. */
export interface FlowScreenResponse {
  /** Next screen id, or "SUCCESS" to complete the flow. */
  screen?: string;
  data?: Record<string, unknown>;
  /** Error response — the client renders a generic error state. */
  error?: string;
}

type PersistOutcome = 'created' | 'duplicate' | 'invalid' | 'error';

interface PersistResult {
  outcome: PersistOutcome;
  /** Human-readable reason for invalid/error. */
  message?: string;
  /** WhatsApp confirmation text to send when outcome is 'created'. */
  confirmation?: string;
}

// ─── Small helpers (pure) ───────────────────

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asRating(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value >= 1 && value <= 5 ? value : null;
  if (typeof value === 'string' && /^\d$/.test(value)) {
    const parsed = Number(value);
    return parsed >= 1 && parsed <= 5 ? parsed : null;
  }
  return null;
}

/** Today's date in IST (Asia/Kolkata) as YYYY-MM-DD — business dates are IST. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeString(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Add minutes to "HH:MM", clamping to the end of the day (slot end time). */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function errorScreen(message: string): FlowScreenResponse {
  return { error: message };
}

// ─── WhatsApp confirmation text ─────────────

/**
 * Send the customer a plain WhatsApp confirmation after a flow outcome is
 * persisted. Credentials come from the restaurant row; failures are logged,
 * never thrown — the outcome is already saved at this point.
 */
async function sendConfirmation(
  restaurantId: string,
  toPhone: string,
  text: string
): Promise<void> {
  try {
    const restaurant = await getRestaurantById(restaurantId);
    const phoneNumberId = restaurant?.whatsapp_phone_id;
    const accessToken = restaurant?.whatsapp_token;
    if (!phoneNumberId || !accessToken) {
      console.warn(
        `[FlowsHandler] Restaurant ${restaurantId} has no WhatsApp credentials — skipping confirmation text`
      );
      return;
    }
    await sendTextMessage({ phoneNumberId, accessToken, to: toPhone, text });
  } catch (error) {
    console.error('[FlowsHandler] Failed to send flow confirmation text:', (error as Error).message);
  }
}

// ─── Idempotent persisters (shared by endpoint + webhook paths) ──

/** APPOINTMENT_BOOKING: create the appointments row (conflict → duplicate). */
async function persistAppointmentOutcome(
  token: FlowTokenPayload,
  data: Record<string, unknown>
): Promise<PersistResult> {
  const serviceId = asString(data.service_id);
  const date = asString(data.date);
  const time = asString(data.time);

  if (!serviceId) return { outcome: 'invalid', message: 'Missing service selection. Please start again.' };
  if (!date || !isValidDateString(date) || date < todayIst()) {
    return { outcome: 'invalid', message: 'Please pick a valid date from today onwards.' };
  }
  if (!time || !isValidTimeString(time)) {
    return { outcome: 'invalid', message: 'Please pick a valid time slot.' };
  }

  const item = await getMenuItemById(serviceId);
  if (!item || item.restaurant_id !== token.rid) {
    return { outcome: 'invalid', message: 'That service is no longer available. Please start again.' };
  }

  // Slot duration: restaurant business_config.slot_duration_minutes (salon
  // convention per the multi-business migration), fallback 30 minutes.
  const restaurant = await getRestaurantById(token.rid);
  const businessConfig = (restaurant?.business_config ?? {}) as Record<string, unknown>;
  const durationMinutes =
    typeof businessConfig.slot_duration_minutes === 'number' && businessConfig.slot_duration_minutes > 0
      ? businessConfig.slot_duration_minutes
      : 30;

  const customer = await getOrCreateCustomer(token.rid, token.phone, token.name);
  const { appointment, error } = await createAppointment({
    restaurant_id: token.rid,
    customer_id: customer.id !== 'unknown' ? customer.id : undefined,
    service_name: item.name,
    service_price: item.price,
    appointment_date: date,
    start_time: time,
    end_time: addMinutesToTime(time, durationMinutes),
    customer_name: token.name || customer.name || undefined,
    customer_phone: token.phone,
    notes: 'Booked via WhatsApp Flow',
  });

  if (error) {
    // A slot conflict at this point is almost certainly our own earlier insert
    // (the endpoint persisted before the flow_response webhook arrived).
    if (error.toLowerCase().includes('booked')) {
      return { outcome: 'duplicate' };
    }
    console.error('[FlowsHandler] createAppointment failed:', error);
    return { outcome: 'error', message: 'We could not save your booking. Please try again in a few minutes.' };
  }
  if (!appointment) {
    return { outcome: 'error', message: 'We could not save your booking. Please try again in a few minutes.' };
  }

  return {
    outcome: 'created',
    confirmation: `✅ Booking confirmed!\n\n${item.name}\n📅 ${date}\n⏰ ${formatTimeLabel(time)}\n\nWe'll see you soon!`,
  };
}

/** FEEDBACK: save the order rating (token.oid) or log a conversation note. */
async function persistFeedbackOutcome(
  token: FlowTokenPayload,
  data: Record<string, unknown>
): Promise<PersistResult> {
  const rating = asRating(data.rating);
  if (!rating) return { outcome: 'invalid', message: 'Missing rating. Please start again.' };
  const feedback = asString(data.feedback);

  if (token.oid) {
    // Feedback tied to a specific order (sent post-order with the order id in the token).
    // Read-before-write so the webhook path doesn't double-apply the endpoint's write.
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('rating, feedback')
      .eq('id', token.oid)
      .eq('restaurant_id', token.rid)
      .maybeSingle();
    if (order) {
      const existing = order as Record<string, unknown>;
      if (existing.rating === rating && (existing.feedback as string) === (feedback ?? '')) {
        return { outcome: 'duplicate' };
      }
    }
    await saveOrderRating(token.oid, rating, token.rid, feedback ?? '');
  } else {
    // General feedback — log it into the conversation so it reaches the AI context.
    const note = `⭐ ${rating}/5${feedback ? ` — "${feedback}"` : ' (no comment)'}`;
    const customer = await getOrCreateCustomer(token.rid, token.phone, token.name);

    // Dedupe guard: the flow_response webhook may re-deliver an outcome the
    // endpoint path already logged.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('restaurant_id', token.rid)
      .eq('customer_phone', token.phone)
      .eq('content', note)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);
    if (recent && recent.length > 0) {
      return { outcome: 'duplicate' };
    }

    await saveMessage(`${token.rid}:${customer.id}`, token.rid, 'customer', note, undefined, {
      phone: token.phone,
      flow: 'feedback',
      rating,
    });
  }

  const thanks =
    rating >= 4
      ? `Thank you so much for rating us ${rating}/5! 🙏 We're glad you had a great experience.`
      : `Thank you for your honest feedback (${rating}/5). We're sorry we fell short — we'll do better.`;
  return { outcome: 'created', confirmation: thanks };
}

/** ADDRESS_CAPTURE: save the delivery address + attach it to the active cart. */
async function persistAddressOutcome(
  token: FlowTokenPayload,
  data: Record<string, unknown>
): Promise<PersistResult> {
  const name = asString(data.name);
  const phone = asString(data.phone);
  const address = asString(data.address);
  const landmark = asString(data.landmark);

  if (!name) return { outcome: 'invalid', message: 'Please enter your name.' };
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return { outcome: 'invalid', message: 'Please enter a valid phone number.' };
  }
  if (!address || address.length < 8) {
    return { outcome: 'invalid', message: 'Please enter your full address.' };
  }

  const fullAddress = landmark ? `${address} (Landmark: ${landmark})` : address;
  const customer = await getOrCreateCustomer(token.rid, token.phone, token.name);
  if (customer.id === 'unknown') {
    return { outcome: 'error', message: 'We could not save your address. Please try again.' };
  }

  // Dedupe guard: skip when this exact address is already saved (webhook path
  // re-delivering an outcome the endpoint path already persisted).
  const saved = await getSavedAddresses(customer.id);
  const alreadySaved = saved.includes(fullAddress);

  if (!alreadySaved) {
    // Save to the customer's address book (max 5, newest first).
    await addSavedAddress(customer.id, fullAddress);

    // Fill in the saved name when the customer profile doesn't have one yet.
    if (!customer.name) {
      await supabaseAdmin.from('customers').update({ saved_name: name }).eq('id', customer.id);
    }
  }

  // Attach to the customer's active cart so checkout uses it automatically.
  // (Idempotent: overwrites the same metadata values.)
  try {
    const { data: cart } = await supabaseAdmin
      .from('cart_sessions')
      .select('id, metadata')
      .eq('restaurant_id', token.rid)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cart) {
      const existing = (cart.metadata as Record<string, unknown>) || {};
      await supabaseAdmin
        .from('cart_sessions')
        .update({
          metadata: {
            ...existing,
            delivery_address: fullAddress,
            customer_name: name,
            customer_phone: phone,
          },
        })
        .eq('id', cart.id);
    }
  } catch (error) {
    console.warn('[FlowsHandler] Failed to update cart metadata:', (error as Error).message);
  }

  if (alreadySaved) {
    return { outcome: 'duplicate' };
  }
  return {
    outcome: 'created',
    confirmation: `📍 Address saved!\n\n${name}\n${fullAddress}\n\nWe'll deliver your order here.`,
  };
}

// ─── Entry point 1: encrypted endpoint ──────

/**
 * Handle a decrypted, token-verified flow request and produce the next
 * screen response. Never throws.
 */
export async function handleFlowRequest(
  token: FlowTokenPayload,
  request: FlowEndpointRequest
): Promise<FlowScreenResponse> {
  try {
    const action = request.action;

    // Health check / client error notifications are handled by the route.
    if (action === 'ping' || (request.data && typeof request.data.error === 'string')) {
      return { data: { acknowledged: true } };
    }

    // INIT: user just opened the flow. BACK: re-render (no refresh_on_back in our flows).
    if (action === 'INIT' || action === 'BACK') {
      return { screen: FLOW_FIRST_SCREEN[token.flow] ?? FLOW_FIRST_SCREEN.address, data: {} };
    }

    if (action !== 'data_exchange') {
      console.warn(`[FlowsHandler] Unknown action "${action}" — returning first screen`);
      return { screen: FLOW_FIRST_SCREEN[token.flow] ?? FLOW_FIRST_SCREEN.address, data: {} };
    }

    const screen = request.screen ?? '';
    const data = request.data ?? {};

    switch (token.flow) {
      // ── APPOINTMENT_BOOKING ──
      case 'appointment': {
        if (screen === APPOINTMENT_SCREENS.SERVICE_PICK) {
          const serviceId = asString(data.service_id);
          if (!serviceId) return errorScreen('Please select a service first.');
          const item = await getMenuItemById(serviceId);
          if (!item || !item.is_available || item.restaurant_id !== token.rid) {
            return errorScreen('That service is no longer available. Please start again.');
          }
          return { screen: APPOINTMENT_SCREENS.DATE_TIME, data: { summary_service: item.name } };
        }

        if (screen === APPOINTMENT_SCREENS.DATE_TIME) {
          const date = asString(data.date);
          const time = asString(data.time);
          if (!date || !isValidDateString(date)) return errorScreen('Please pick a valid date.');
          if (!time || !isValidTimeString(time)) return errorScreen('Please pick a valid time slot.');
          if (date < todayIst()) return errorScreen('Please pick a date from today onwards.');

          // Soft availability check against existing appointments. When the
          // restaurant has no business hours configured, getAvailableSlots
          // returns [] and we trust the chips baked into the Flow JSON.
          try {
            const slots = await getAvailableSlots(token.rid, date);
            const slot = slots.find((s) => s.start_time === time);
            if (slot && !slot.available) {
              return errorScreen('That slot was just booked. Please start again and pick another time.');
            }
          } catch (error) {
            console.warn('[FlowsHandler] Availability check failed, continuing:', (error as Error).message);
          }

          // The service selection is echoed by the client (accumulated form data).
          const serviceId = asString(data.service_id);
          let serviceName = 'Your appointment';
          if (serviceId) {
            const item = await getMenuItemById(serviceId);
            if (item) serviceName = item.name;
          }
          return {
            screen: APPOINTMENT_SCREENS.CONFIRM,
            data: { summary: `${serviceName}\n📅 ${date}\n⏰ ${formatTimeLabel(time)}` },
          };
        }

        if (screen === APPOINTMENT_SCREENS.CONFIRM) {
          const result = await persistAppointmentOutcome(token, data);
          if (result.outcome === 'created' && result.confirmation) {
            await sendConfirmation(token.rid, token.phone, result.confirmation);
            return { screen: 'SUCCESS' };
          }
          if (result.outcome === 'duplicate') {
            // Slot conflict — either just booked by someone else, or this flow
            // was already processed. Nothing further to persist.
            return errorScreen('That slot was just booked. Please start again and pick another time.');
          }
          return errorScreen(result.message ?? 'We could not save your booking. Please try again.');
        }
        return errorScreen('Unknown screen. Please start again.');
      }

      // ── FEEDBACK ──
      case 'feedback': {
        if (screen === FEEDBACK_SCREENS.RATING) {
          const rating = asRating(data.rating);
          if (!rating) return errorScreen('Please select a rating first.');
          return { screen: FEEDBACK_SCREENS.COMMENT, data: { rating_summary: `${rating}/5` } };
        }

        if (screen === FEEDBACK_SCREENS.COMMENT) {
          const result = await persistFeedbackOutcome(token, data);
          if (result.outcome === 'created' && result.confirmation) {
            await sendConfirmation(token.rid, token.phone, result.confirmation);
            return { screen: 'SUCCESS' };
          }
          if (result.outcome === 'duplicate') {
            return { screen: 'SUCCESS' }; // already processed — complete silently
          }
          return errorScreen(result.message ?? 'We could not save your feedback. Please try again.');
        }
        return errorScreen('Unknown screen. Please start again.');
      }

      // ── ADDRESS_CAPTURE ──
      case 'address': {
        if (screen !== ADDRESS_SCREENS.ADDRESS) {
          return errorScreen('Unknown screen. Please start again.');
        }
        const result = await persistAddressOutcome(token, data);
        if (result.outcome === 'created' && result.confirmation) {
          await sendConfirmation(token.rid, token.phone, result.confirmation);
          return { screen: 'SUCCESS' };
        }
        if (result.outcome === 'duplicate') {
          return { screen: 'SUCCESS' }; // already processed — complete silently
        }
        return errorScreen(result.message ?? 'We could not save your address. Please try again.');
      }

      default:
        return errorScreen('This flow is no longer supported.');
    }
  } catch (error) {
    console.error('[FlowsHandler] Unexpected error handling flow request:', error);
    return errorScreen('Something went wrong. Please try again.');
  }
}

// ─── Entry point 2: flow_response webhook ───

/**
 * Handle a WhatsApp flow_response webhook: persist the final accumulated
 * screen data for the flow identified by the (verified) token payload.
 *
 * Used by src/lib/flows/webhook-bridge.ts. Idempotent: when the encrypted
 * endpoint already persisted the outcome, this is a no-op. Never throws.
 */
export async function handleFlowResponse(
  tokenPayload: FlowTokenPayload,
  screenData: Record<string, unknown>
): Promise<void> {
  try {
    let result: PersistResult;
    switch (tokenPayload.flow) {
      case 'appointment':
        result = await persistAppointmentOutcome(tokenPayload, screenData);
        break;
      case 'feedback':
        result = await persistFeedbackOutcome(tokenPayload, screenData);
        break;
      case 'address':
        result = await persistAddressOutcome(tokenPayload, screenData);
        break;
      default:
        console.warn(`[FlowsHandler] Unknown flow kind "${tokenPayload.flow}" in webhook path`);
        return;
    }

    if (result.outcome === 'created' && result.confirmation) {
      // Only fresh outcomes text the customer — duplicates are skipped so the
      // endpoint path's confirmation isn't sent twice.
      await sendConfirmation(tokenPayload.rid, tokenPayload.phone, result.confirmation);
    } else if (result.outcome === 'invalid' || result.outcome === 'error') {
      console.warn(`[FlowsHandler] Webhook path ${result.outcome}: ${result.message ?? 'unknown'}`);
    }
  } catch (error) {
    console.error('[FlowsHandler] Unexpected error in handleFlowResponse:', error);
  }
}
