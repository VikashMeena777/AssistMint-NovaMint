// ============================================
// WhatsApp Webhook — Receives messages from Meta Cloud API
// Wired into AI Ordering Orchestrator
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/ai/orchestrator';
import { handleOwnerReply } from '@/lib/services/owner-notifications';
import { getRestaurantByPhoneId } from '@/lib/services/restaurant-service';
import { handleOrderWebhook } from '@/lib/whatsapp/order-webhook';
import { handlePaymentWebhook } from '@/lib/whatsapp/payment-webhook';
import { handleFlowResponseWebhook } from '@/lib/flows/webhook-bridge';
import { webhookLimiter, checkRateLimit } from '@/lib/utils/rate-limiter';
import crypto from 'crypto';

// Vercel: max 45s for webhook (Groq 10s + NIM 25s fallback + DB overhead)
export const maxDuration = 45;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'assistmint-verify';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// ─── Signature Verification ─────────────────
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[WhatsApp Webhook] WHATSAPP_APP_SECRET not set — rejecting webhook. Configure it to enable signature verification.');
      return false;
    }
    console.warn('[WhatsApp Webhook] ⚠️ WHATSAPP_APP_SECRET not set — signature verification DISABLED (dev only). Set it in production!');
    return true;
  }
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const receivedSignature = signatureHeader.replace('sha256=', '');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── GET: Webhook Verification (Meta handshake) ─────

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[WhatsApp Webhook] Verification failed — token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST: Incoming Messages & Status Updates ───────

// In-memory dedup: prevent processing the same message ID twice
// Uses timestamp-based expiry so messages aren't permanently blocked
const processedMessages = new Map<string, number>(); // msgId → timestamp when processed
const DEDUP_WINDOW_MS = 2 * 60 * 1000; // 2 minutes — after this, allow reprocessing
const MAX_PROCESSED_CACHE = 5000;

function isRecentlyProcessed(msgId: string): boolean {
  const processedAt = processedMessages.get(msgId);
  if (!processedAt) return false;
  // If processed within the dedup window, consider it duplicate
  if (Date.now() - processedAt < DEDUP_WINDOW_MS) return true;
  // Expired — remove and allow reprocessing
  processedMessages.delete(msgId);
  return false;
}

function markProcessed(msgId: string) {
  processedMessages.set(msgId, Date.now());
  // Prevent memory leak — trim oldest entries
  if (processedMessages.size > MAX_PROCESSED_CACHE) {
    const entries = [...processedMessages.entries()]
      .sort((a, b) => a[1] - b[1]) // oldest first
      .slice(0, 1000);
    for (const [key] of entries) {
      processedMessages.delete(key);
    }
  }
}

function unmarkProcessed(msgId: string) {
  processedMessages.delete(msgId);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const rl = await checkRateLimit(webhookLimiter, `wh:${ip}`);
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify X-Hub-Signature-256 (HMAC-SHA256)
    const signatureHeader = req.headers.get('x-hub-signature-256');
    if (!verifySignature(rawBody, signatureHeader)) {
      console.error('[WhatsApp Webhook] Signature verification FAILED');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Verify the webhook is from WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object' }, { status: 400 });
    }

    // Collect messages to process
    const messagesToProcess: Array<{
      phoneNumberId: string;
      message: Record<string, unknown>;
      whatsappName?: string;
    }> = [];

    // Process each entry
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        // 'messages' = normal messaging; 'orders' = catalog cart orders;
        // 'payments' = India in-chat UPI payment status
        if (change.field !== 'messages' && change.field !== 'orders' && change.field !== 'payments') continue;

        const value = change.value;
        const metadata = value.metadata;
        const phoneNumberId = metadata?.phone_number_id;

        // Get WhatsApp profile name
        const contacts = value.contacts || [];
        const whatsappName = contacts[0]?.profile?.name;

        // Handle incoming messages
        const messages = value.messages || [];
        for (const message of messages) {
          const msgId = message.id as string;

          // ── DEBUG: Log raw message structure (dev only) ──
          if (process.env.NODE_ENV === 'development') {
            console.log(`[WhatsApp Webhook] RAW MESSAGE type=${message.type} id=${msgId}`, JSON.stringify({
              type: message.type,
              text: message.text,
              interactive: message.interactive,
              button: message.button,
              context: message.context,
            }));
          }

          // ── DEDUP CHECK: Skip if processed within last 2 minutes ──
          if (isRecentlyProcessed(msgId)) {
            console.log(`[WhatsApp Webhook] Skipping duplicate message (processed <2min ago): ${msgId}`);
            continue;
          }

          // ── TIMESTAMP CHECK: Skip messages older than 30 minutes ──
          // Prevents replaying old messages on server redeploy
          const msgTimestamp = parseInt(message.timestamp as string, 10) * 1000;
          const now = Date.now();
          const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
          if (msgTimestamp && (now - msgTimestamp) > MAX_AGE_MS) {
            console.log(`[WhatsApp Webhook] Skipping stale message (${Math.round((now - msgTimestamp) / 1000)}s old): ${msgId}`);
            markProcessed(msgId);
            continue;
          }

          // Mark as processing NOW to prevent concurrent handling
          markProcessed(msgId);

          messagesToProcess.push({ phoneNumberId, message, whatsappName });
        }

        // Handle status updates (sent, delivered, read) — fire and forget
        const statuses = value.statuses || [];
        for (const status of statuses) {
          processStatusUpdate({
            phoneNumberId,
            messageId: status.id,
            recipientId: status.recipient_id,
            status: status.status,
            timestamp: status.timestamp,
            errors: status.errors,
          });
        }

        // ── Catalog orders (value.orders — the 'orders' webhook field) ──
        // Customer submitted their in-chat WhatsApp cart from the catalog.
        // (Cart submissions can ALSO arrive as message.type === 'order' in
        // the messages loop — handled below in the processing section.)
        const catalogOrders = (value.orders as Array<Record<string, unknown>>) || [];
        if (catalogOrders.length > 0 && phoneNumberId) {
          const orderContacts = (value.contacts as Array<Record<string, unknown>>) || [];
          const orderCustomerPhone = (orderContacts[0] as { wa_id?: string } | undefined)?.wa_id;
          const orderCustomerName = (
            (orderContacts[0] as { profile?: { name?: string } } | undefined)?.profile?.name
          );
          for (const order of catalogOrders) {
            try {
              const restaurant = await getRestaurantByPhoneId(phoneNumberId);
              if (restaurant) {
                await handleOrderWebhook({
                  restaurant,
                  order,
                  customerPhone: orderCustomerPhone,
                  customerName: orderCustomerName,
                });
              }
            } catch (err) {
              console.error('[WhatsApp Webhook] Catalog order handling failed:', err);
            }
          }
        }

        // ── Payment status updates (value.payments — India in-chat UPI) ──
        // Status webhooks for native order_details invoices the customer paid
        // inside WhatsApp (UPI intent / WhatsApp Pay).
        const paymentUpdates = (value.payments as Array<Record<string, unknown>>) || [];
        if (paymentUpdates.length > 0 && phoneNumberId) {
          for (const payment of paymentUpdates) {
            try {
              const restaurant = await getRestaurantByPhoneId(phoneNumberId);
              if (restaurant) {
                await handlePaymentWebhook({
                  restaurant,
                  paymentStatus: String(payment.status || payment.payment_status || ''),
                  referenceId: String(
                    payment.reference_id || payment.referenceId || payment.order_id || ''
                  ),
                });
              }
            } catch (err) {
              console.error('[WhatsApp Webhook] Payment status handling failed:', err);
            }
          }
        }
      }
    }

    // Process messages SYNCHRONOUSLY — Vercel serverless kills background tasks
    // after response is sent, so we MUST await processing before returning
    for (const { phoneNumberId, message, whatsappName } of messagesToProcess) {
      try {
        // Parse interactive replies (regular buttons + list replies)
        let interactiveReply: { type: string; id: string; title: string } | undefined;
        if (message.type === 'interactive') {
          const interactive = message.interactive as Record<string, unknown>;
          if ((interactive as Record<string, unknown>)?.type === 'button_reply') {
            const btnReply = (interactive as Record<string, Record<string, string>>).button_reply;
            interactiveReply = {
              type: 'button',
              id: btnReply.id,
              title: btnReply.title,
            };
          } else if ((interactive as Record<string, unknown>)?.type === 'list_reply') {
            const listReply = (interactive as Record<string, Record<string, string>>).list_reply;
            interactiveReply = {
              type: 'list',
              id: listReply.id,
              title: listReply.title,
            };
          } else if ((interactive as Record<string, unknown>)?.type === 'flow_response') {
            // ── WhatsApp Flow response ──
            // Extract the flow_token (HMAC-signed by us at send time) +
            // response_json screen data and forward to the flows handler.
            // (Flow responses arrive as interactive messages — there is no
            // separate value.flow_response shape on the webhook.)
            const flowResp = (interactive as Record<string, unknown>).flow_response as
              | Record<string, unknown>
              | undefined;
            if (flowResp) {
              try {
                await handleFlowResponseWebhook({
                  phoneNumberId,
                  from: message.from as string,
                  messageId: message.id as string,
                  flowToken: (flowResp.flow_token as string) || '',
                  responseJson:
                    (flowResp.response_json as string | Record<string, unknown>) || '{}',
                });
              } catch (err) {
                console.error('[WhatsApp Webhook] Flow response handling failed:', err);
              }
            }
            continue;
          }
        }

        // Parse carousel quick_reply button clicks
        // WhatsApp sends these as message.type === 'button' with payload/text
        if (message.type === 'button') {
          const button = message.button as Record<string, string> | undefined;
          if (button) {
            console.log(`[WhatsApp Webhook] Carousel button click: payload=${button.payload} text=${button.text}`);
            interactiveReply = {
              type: 'button',
              id: button.payload || button.text || '',
              title: button.text || button.payload || '',
            };
          }
        }

        // Parse location messages
        let locationData: { latitude: number; longitude: number; name?: string; address?: string } | undefined;
        if (message.type === 'location') {
          const loc = message.location as Record<string, unknown>;
          locationData = {
            latitude: loc.latitude as number,
            longitude: loc.longitude as number,
            name: loc.name as string | undefined,
            address: loc.address as string | undefined,
          };
        }

        // Parse media messages (image, video, audio, document, sticker)
        let mediaData: { type: string; mediaId: string; mimeType?: string; caption?: string } | undefined;
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        if (mediaTypes.includes(message.type as string)) {
          const media = message[message.type as string] as Record<string, string> | undefined;
          if (media) {
            mediaData = {
              type: message.type as string,
              mediaId: media.id || '',
              mimeType: media.mime_type,
              caption: media.caption,
            };
          }
        }

        // Parse reaction messages (emoji reactions on messages)
        if (message.type === 'reaction') {
          const reaction = message.reaction as Record<string, string> | undefined;
          if (reaction) {
            console.log(`[WhatsApp Webhook] Reaction ${reaction.emoji} on ${reaction.message_id} from ${message.from}`);
            continue; // Reactions are logged but not forwarded to orchestrator
          }
        }

        // ── Catalog cart order (customer submitted their WhatsApp cart) ──
        // Arrives as message.type === 'order' with order.products[]; converted
        // to a real order by handleOrderWebhook
        if (message.type === 'order') {
          const orderPayload = message.order as Record<string, unknown> | undefined;
          if (orderPayload) {
            try {
              const restaurant = await getRestaurantByPhoneId(phoneNumberId);
              if (restaurant) {
                await handleOrderWebhook({
                  restaurant,
                  order: { ...orderPayload, id: orderPayload.id || message.id },
                  customerPhone: message.from as string,
                  customerName: whatsappName,
                });
              }
            } catch (err) {
              console.error('[WhatsApp Webhook] Catalog order (message) handling failed:', err);
            }
          }
          continue;
        }

        // ── location_request_message ack ──
        // Ack when the customer taps the share-location button on a native
        // location request (interactive type location_request_message). The
        // shared location itself arrives separately as a normal location
        // message (already handled) — nothing to do here, just don't route
        // the ack into the orchestrator.
        if (message.type === 'location_request_message') {
          console.log(`[WhatsApp Webhook] Location request ack from ${message.from}`);
          continue;
        }

        // Check if this is a restaurant owner replying to manage orders
        const msgText = (message.text as Record<string, string>)?.body || '';
        const commandText = interactiveReply?.id || msgText;
        const isOwner = await handleOwnerReply(phoneNumberId, message.from as string, commandText);
        if (isOwner) continue; // Owner message handled, skip customer orchestrator

        // Route to AI orchestrator (customer messages)
        await handleIncomingMessage({
          phoneNumberId,
          from: message.from as string,
          messageId: message.id as string,
          text: msgText || (mediaData?.caption) || undefined,
          interactiveReply,
          whatsappName,
          location: locationData,
          media: mediaData,
        });
      } catch (err) {
        console.error(`[WhatsApp Webhook] Error processing message ${message.id}:`, err);
        // Remove from dedup cache so Meta's retry can reprocess this message
        unmarkProcessed(message.id as string);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    // Always return 200 to prevent retry storms
    return NextResponse.json({ error: 'Internal error' }, { status: 200 });
  }
}


// ─── Status Update Processing ───────────────

interface StatusUpdate {
  phoneNumberId: string;
  messageId: string;
  recipientId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{ code: number; title: string }>;
}

async function processStatusUpdate(status: StatusUpdate) {
  if (status.status === 'failed') {
    console.error(`[WhatsApp] Message ${status.messageId} failed:`, status.errors);
  }
}
