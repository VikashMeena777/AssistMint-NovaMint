// ============================================
// AssistMint — WhatsApp Flows Data Endpoint
// The public HTTPS endpoint Meta calls for every
// endpoint-powered Flow (health check + encrypted
// data exchange).
//
//   GET  → health check (must return {"data":[{"status":"ready"}],"version":...})
//   POST → encrypted data exchange:
//            1. (optional) verify X-Hub-Signature-256 → 432 on mismatch
//            2. decrypt encrypted_aes_key (RSA-OAEP-SHA256) + encrypted_flow_data (AES-GCM) → 421 on failure
//            3. route by decrypted action: ping | error notification | INIT/BACK/data_exchange
//            4. verify the HMAC flow token → 427 when expired/invalid
//            5. handleFlowRequest → next screen / SUCCESS
//            6. encrypt the response (same key, bit-flipped IV) → base64 text/plain
//
// Contract rules (Meta blocks endpoints on 5xx rates):
//   - never returns 500: failures become encrypted {"error": "..."} payloads
//     or the documented 421 / 427 / 432 codes
//   - must respond within 10 seconds (Meta's endpoint timeout)
//   - no usable private key → 503 with a clear log (config error)
//
// The RSA keypair self-provisions on the first Meta call (getOrCreateFlowKeys:
// one keypair per app, stored in the service-role-only `app_config` table).
// FLOWS_PRIVATE_KEY remains an OPTIONAL env override — when set, it wins.
//
// Spec: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  decryptRequest,
  encryptResponse,
  FlowCryptoError,
  type DecryptedFlowRequest,
} from '@/lib/flows/encryption';
import { getOrCreateFlowKeys } from '@/lib/flows/keys';
import { verifyFlowToken } from '@/lib/flows/token';
import { handleFlowRequest } from '@/lib/flows/handle-flow-response';

export const runtime = 'nodejs';
// Vercel function budget; Meta's own client timeout is 10s, so handlers must stay fast.
export const maxDuration = 30;

/** Data API version this endpoint implements (matches data_api_version in our Flow JSON). */
const DATA_API_VERSION = '3.0';

// ─── Request field parsing ──────────────────

interface EndpointBodyFields {
  encryptedFlowData: string | null;
  encryptedAesKey: string | null;
  /** `initial_vector` (current protocol) or `encrypted_iv` (legacy) — both accepted. */
  iv: string | null;
}

/**
 * Meta sends the fields as JSON (current docs) but some client/SDK generations
 * use application/x-www-form-urlencoded — parse both.
 */
function parseEndpointFields(rawBody: string): EndpointBodyFields {
  let record: Record<string, unknown> = {};
  const trimmed = rawBody.trim();

  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        record = parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to form parsing
    }
  }
  if (Object.keys(record).length === 0) {
    const params = new URLSearchParams(trimmed);
    for (const [key, value] of params) {
      record[key] = value;
    }
  }

  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return null;
  };

  return {
    encryptedFlowData: pick('encrypted_flow_data'),
    encryptedAesKey: pick('encrypted_aes_key'),
    iv: pick('initial_vector', 'encrypted_iv'),
  };
}

// ─── Signature verification ─────────────────

/**
 * Verify Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with
 * the app secret). Returns:
 *   null  — cannot verify (no header or no secret configured) → proceed
 *   true  — signature valid
 *   false — signature mismatch → endpoint must return 432
 */
function verifyRequestSignature(rawBody: string, signatureHeader: string | null): boolean | null {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!signatureHeader || !secret) return null;

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody, 'utf-8').digest('hex')}`;
  if (expected.length !== signatureHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signatureHeader, 'utf-8'));
  } catch {
    return false;
  }
}

// ─── Encrypted response helper ──────────────

function encryptedResponse(decrypted: DecryptedFlowRequest, payload: unknown): NextResponse {
  const body = encryptResponse(payload, decrypted.aesKey, decrypted.iv, {
    flipIv: decrypted.flipIvForResponse,
  });
  return new NextResponse(body, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}

// ─── GET: health check ──────────────────────

export async function GET(): Promise<NextResponse> {
  // Self-provision on the first health check: getOrCreateFlowKeys generates
  // and stores the app-wide keypair when absent (env override wins when set).
  let keysReady = true;
  let reason: string | undefined;
  try {
    await getOrCreateFlowKeys();
  } catch (error) {
    keysReady = false;
    reason = (error as Error).message;
    console.error('[FlowsEndpoint] GET health check: key provisioning failed —', reason);
  }

  return NextResponse.json({
    data: [
      {
        status: keysReady ? 'ready' : 'not_ready',
        endpoint_health_data: {
          data: {
            service: 'assistmint-flows-endpoint',
            data_api_version: DATA_API_VERSION,
            private_key_configured: keysReady,
            ...(keysReady ? {} : { reason: reason ?? 'Flow keypair unavailable' }),
          },
        },
      },
    ],
    version: DATA_API_VERSION,
  });
}

// ─── POST: encrypted data exchange ──────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let decrypted: DecryptedFlowRequest | null = null;

  try {
    const rawBody = await req.text();

    // 1. Signature validation (when Meta signs and the app secret is configured).
    const signatureOk = verifyRequestSignature(rawBody, req.headers.get('x-hub-signature-256'));
    if (signatureOk === false) {
      console.error('[FlowsEndpoint] Rejecting request: X-Hub-Signature-256 mismatch');
      return NextResponse.json({ error: 'signature' }, { status: 432 });
    }

    // 2. Parse the three encrypted fields.
    const fields = parseEndpointFields(rawBody);
    if (!fields.encryptedFlowData || !fields.encryptedAesKey || !fields.iv) {
      console.error('[FlowsEndpoint] Missing encrypted request fields');
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // 3. Private key — self-provisioned app-wide keypair (src/lib/flows/keys.ts);
    //    FLOWS_PRIVATE_KEY env var, when set, overrides it. 503 (not 500) when
    //    no key can be obtained — a config error, never a handler crash.
    let privateKeyPem: string;
    try {
      privateKeyPem = (await getOrCreateFlowKeys()).privateKeyPem;
    } catch (error) {
      console.error(
        '[FlowsEndpoint] Flow key unavailable — returning 503:',
        (error as Error).message
      );
      return NextResponse.json({ error: 'endpoint_not_configured' }, { status: 503 });
    }

    // 4. Decrypt.
    try {
      decrypted = decryptRequest(
        fields.encryptedAesKey,
        fields.encryptedFlowData,
        fields.iv,
        privateKeyPem
      );
    } catch (error) {
      if (error instanceof FlowCryptoError) {
        console.error(`[FlowsEndpoint] ${error.code}: ${error.message}`);
        // 421 → the client re-fetches our public key and retries.
        return NextResponse.json({ error: error.code }, { status: error.httpStatus });
      }
      throw error;
    }

    const { request } = decrypted;

    // 5. Health check ping.
    if (request.action === 'ping') {
      return encryptedResponse(decrypted, {
        version: request.version ?? DATA_API_VERSION,
        data: { status: 'active' },
      });
    }

    // 6. Asynchronous error notification from the client (our previous payload was invalid).
    if (request.data && typeof request.data.error === 'string') {
      console.warn(
        `[FlowsEndpoint] Client error notification: ${JSON.stringify(request.data).slice(0, 500)}`
      );
      return encryptedResponse(decrypted, { data: { acknowledged: true } });
    }

    // 7. Verify the flow token (stateless, HMAC-signed).
    const token =
      typeof request.flow_token === 'string' ? verifyFlowToken(request.flow_token) : null;
    if (!token) {
      // 427 disables the CTA for this user; they need a fresh flow message.
      return NextResponse.json(
        { error_msg: 'This form has expired. Please ask for a new one.' },
        { status: 427 }
      );
    }

    // 8. Route to the flow handler and return the encrypted next screen.
    const response = await handleFlowRequest(token, request);
    return encryptedResponse(decrypted, response);
  } catch (error) {
    // Never 500: if we managed to decrypt, return an encrypted generic error so the
    // client shows a friendly state instead of hammering Meta's error accounting.
    if (decrypted) {
      console.error('[FlowsEndpoint] Handler error (returning encrypted error screen):', error);
      return encryptedResponse(decrypted, {
        error: 'Something went wrong. Please try again.',
      });
    }
    console.error('[FlowsEndpoint] Unhandled request error:', error);
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
}
