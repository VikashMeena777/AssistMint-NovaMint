// ============================================
// WhatsApp Webhook — Receives messages from Meta Cloud API
// Wired into AI Ordering Orchestrator
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/ai/orchestrator';
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
          // Parse interactive replies
          let interactiveReply: { type: string; id: string; title: string } | undefined;
          if (message.type === 'interactive') {
            const interactive = message.interactive;
            if (interactive?.type === 'button_reply') {
              interactiveReply = {
                type: 'button',
                id: interactive.button_reply.id,
                title: interactive.button_reply.title,
              };
            } else if (interactive?.type === 'list_reply') {
              interactiveReply = {
                type: 'list',
                id: interactive.list_reply.id,
                title: interactive.list_reply.title,
              };
            }
          }

          // Route to AI orchestrator
          await handleIncomingMessage({
            phoneNumberId,
            from: message.from,
            messageId: message.id,
            text: message.text?.body,
            interactiveReply,
            whatsappName,
          });
        }

        // Handle status updates (sent, delivered, read)
        const statuses = value.statuses || [];
        for (const status of statuses) {
          await processStatusUpdate({
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
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
