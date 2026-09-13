// ============================================
// AssistMint — WhatsApp Flows Tokens
// Stateless, HMAC-signed tokens that map an incoming
// encrypted data-exchange request back to a
// restaurant + flow kind + customer phone without
// any server-side session storage.
//
// Format: base64url(payloadJson) + "." + base64url(HMAC-SHA256(payloadJson))
//
// The token is generated at send time (passed as `flow_token` in the
// interactive flow message) and verified on every endpoint hit.
// ============================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FlowKind } from './definitions';

// ─── Types ──────────────────────────────────

export interface FlowTokenPayload {
  /** Restaurant ID the flow belongs to. */
  rid: string;
  /** Which vertical flow this token opens. */
  flow: FlowKind;
  /** Customer phone (digits, may include country code). */
  phone: string;
  /** Issued-at (epoch ms). */
  iat: number;
  /** Expiry (epoch ms) — expired tokens get HTTP 427 from the endpoint. */
  exp: number;
  /** Feedback flow: the order this rating belongs to. */
  oid?: string;
  /** Customer ID (when known at send time). */
  cid?: string;
  /** Customer name (for prefills / confirmations). */
  name?: string;
}

export interface CreateFlowTokenInput {
  rid: string;
  flow: FlowKind;
  phone: string;
  /** Expiry in ms from now. Default: 24 hours. */
  ttlMs?: number;
  oid?: string;
  cid?: string;
  name?: string;
}

// ─── Secret ─────────────────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — flows are opened shortly after being sent

/**
 * HMAC secret for flow tokens. Dedicated FLOWS_TOKEN_SECRET preferred;
 * falls back to WHATSAPP_APP_SECRET (already configured) so single-tenant
 * deployments work without another env var.
 */
export function getFlowTokenSecret(): string | null {
  return process.env.FLOWS_TOKEN_SECRET || process.env.WHATSAPP_APP_SECRET || null;
}

// ─── Encoding helpers (pure) ────────────────

function base64Url(input: Buffer): string {
  return input.toString('base64url');
}

function hmacPayload(secret: string, payload: string): Buffer {
  return createHmac('sha256', secret).update(payload, 'utf-8').digest();
}

function isFlowKind(value: unknown): value is FlowKind {
  return value === 'appointment' || value === 'feedback' || value === 'address';
}

/** Narrow an unknown parsed JSON value into a FlowTokenPayload. */
export function parseTokenPayload(value: unknown): FlowTokenPayload | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const { rid, flow, phone, iat, exp } = record;
  if (typeof rid !== 'string' || rid.length === 0) return null;
  if (!isFlowKind(flow)) return null;
  if (typeof phone !== 'string' || phone.length === 0) return null;
  if (typeof iat !== 'number' || typeof exp !== 'number') return null;

  const payload: FlowTokenPayload = { rid, flow, phone, iat, exp };
  if (typeof record.oid === 'string' && record.oid.length > 0) payload.oid = record.oid;
  if (typeof record.cid === 'string' && record.cid.length > 0) payload.cid = record.cid;
  if (typeof record.name === 'string' && record.name.length > 0) payload.name = record.name;
  return payload;
}

// ─── Create / verify ────────────────────────

/** Create a signed flow token to pass as `flow_token` when sending a flow message. */
export function createFlowToken(input: CreateFlowTokenInput): string {
  const secret = getFlowTokenSecret();
  if (!secret) {
    throw new Error(
      '[FlowsToken] Cannot sign flow tokens: set FLOWS_TOKEN_SECRET (or WHATSAPP_APP_SECRET) in the environment'
    );
  }

  const now = Date.now();
  const payload: FlowTokenPayload = {
    rid: input.rid,
    flow: input.flow,
    phone: input.phone,
    iat: now,
    exp: now + (input.ttlMs ?? DEFAULT_TTL_MS),
  };
  if (input.oid) payload.oid = input.oid;
  if (input.cid) payload.cid = input.cid;
  if (input.name) payload.name = input.name;

  const body = base64Url(Buffer.from(JSON.stringify(payload), 'utf-8'));
  const signature = base64Url(hmacPayload(secret, body));
  return `${body}.${signature}`;
}

/**
 * Verify a flow token: checks the HMAC signature (timing-safe) and expiry.
 * Returns the payload, or null when the token is invalid/expired/tampered.
 */
export function verifyFlowToken(token: string): FlowTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0) return null;

  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;

  const body = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const secret = getFlowTokenSecret();
  if (!secret) return null;

  // Timing-safe signature comparison.
  let signatureBuffer: Buffer;
  try {
    signatureBuffer = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  const expected = hmacPayload(secret, body);
  if (signatureBuffer.length !== expected.length) return null;
  if (!timingSafeEqual(signatureBuffer, expected)) return null;

  // Decode + narrow payload.
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  const payload = parseTokenPayload(parsed);
  if (!payload) return null;

  // Expiry check.
  if (payload.exp < Date.now()) return null;

  return payload;
}
