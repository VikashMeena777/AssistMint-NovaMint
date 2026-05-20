// ============================================
// WhatsApp Webhook — Receives messages from Meta Cloud API
// Wired into AI Ordering Orchestrator
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/ai/orchestrator';
import { handleOwnerReply } from '@/lib/services/owner-notifications';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'assistmint-verify';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// ─── Signature Verification ─────────────────
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) return true; // skip if secret not configured (dev mode)
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const receivedSignature = signatureHeader.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
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
// WhatsApp can redeliver webhooks on timeout/failure
const processedMessages = new Set<string>();
const MAX_PROCESSED_CACHE = 5000;

function markProcessed(msgId: string) {
  processedMessages.add(msgId);
  // Prevent memory leak — trim old entries
  if (processedMessages.size > MAX_PROCESSED_CACHE) {
    const iterator = processedMessages.values();
    for (let i = 0; i < 1000; i++) {
      const val = iterator.next().value;
      if (val) processedMessages.delete(val);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
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
        if (change.field !== 'messages') continue;

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

          // ── DEDUP CHECK: Skip if already processed ──
          if (processedMessages.has(msgId)) {
            console.log(`[WhatsApp Webhook] Skipping duplicate message: ${msgId}`);
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

          // Mark as processed BEFORE handling (prevents race conditions)
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
      }
    }

    // Process messages SYNCHRONOUSLY — Vercel serverless kills background tasks
    // after response is sent, so we MUST await processing before returning
    for (const { phoneNumberId, message, whatsappName } of messagesToProcess) {
      try {
        // Parse interactive replies
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
          text: msgText || undefined,
          interactiveReply,
          whatsappName,
          location: locationData,
        });
      } catch (err) {
        console.error(`[WhatsApp Webhook] Error processing message ${message.id}:`, err);
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
