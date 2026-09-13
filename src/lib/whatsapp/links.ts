// ============================================
// AssistMint — wa.me links & QR codes
// ============================================
// Plain wa.me deep links (no API needed) plus the WhatsApp QR code /
// short-link API (`message_qrdls`) and local QR image generation for
// counters, tables and packaging. QR generation uses the `qrcode` npm
// package server-side (Node runtime) — no external services.

import QRCode from 'qrcode';
import { sanitizeWhatsAppNumber } from './client';
import { graphRequest } from './shared';
import type { GraphPaged, GraphSuccess, PhoneNumberCredential } from './types';

/** Max length of a QR code prefilled message. */
const PREFILLED_MESSAGE_MAX_LENGTH = 140;

/** Read the prefilled message from either camelCase or snake_case option keys. */
function readPrefilledText(options: { prefilledText?: string; prefilled_text?: string }): string {
  return (options.prefilledText ?? options.prefilled_text ?? '').substring(0, PREFILLED_MESSAGE_MAX_LENGTH);
}

// ─── wa.me deep links ──────────────

/**
 * Build a `https://wa.me/<number>?text=...` chat link. 10-digit Indian
 * numbers get the 91 prefix automatically.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export function buildChatLink(phone: string, prefilledText?: string): string {
  const number = sanitizeWhatsAppNumber(phone);
  const base = `https://wa.me/${number}`;
  if (!prefilledText) return base;
  return `${base}?text=${encodeURIComponent(prefilledText)}`;
}

/**
 * Build a `https://wa.me/c/<number>` catalog deep link (opens the business's
 * WhatsApp catalog).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/sell-products-and-services/share-products
 */
export function buildCatalogLink(phone: string): string {
  return `https://wa.me/c/${sanitizeWhatsAppNumber(phone)}`;
}

// ─── QR codes / short links API ──────────────

/** A WhatsApp QR code / short link as returned by the `message_qrdls` API. */
export interface WhatsAppQrCode {
  /** Base64-ish code identifying the short link. */
  code: string;
  prefilled_message?: string;
  deep_link_url?: string;
  /** Signed image URL (only present when created with generate_qr_image). */
  qr_image_url?: string;
}

/** Response of createQrCode / getQrCode. */
export interface WhatsAppQrCodeResult extends WhatsAppQrCode {
  /** The full short link URL (https://wa.me/message/<CODE>). */
  deepLinkUrl: string;
  /** Meta-hosted QR image URL when available. */
  qrImageUrl?: string;
}

function normalizeQrCode(raw: WhatsAppQrCode): WhatsAppQrCodeResult {
  return {
    ...raw,
    deepLinkUrl: raw.deep_link_url ?? `https://wa.me/message/${raw.code}`,
    qrImageUrl: raw.qr_image_url,
  };
}

/**
 * List all QR codes / short links for a phone number (max 2,000 per number).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export async function listQrCodes(options: PhoneNumberCredential): Promise<WhatsAppQrCodeResult[]> {
  const { phoneNumberId, accessToken } = options;
  const data = await graphRequest<GraphPaged<WhatsAppQrCode>>({
    path: `${phoneNumberId}/message_qrdls`,
    accessToken,
  });
  return (data.data ?? []).map(normalizeQrCode);
}

/**
 * Get a single QR code / short link by its code.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export async function getQrCode(
  options: PhoneNumberCredential & { code: string }
): Promise<WhatsAppQrCodeResult> {
  const { phoneNumberId, accessToken, code } = options;
  const data = await graphRequest<WhatsAppQrCode>({
    path: `${phoneNumberId}/message_qrdls/${encodeURIComponent(code)}`,
    accessToken,
  });
  return normalizeQrCode(data);
}

/**
 * Create a QR code / short link with an editable prefilled message (max 140
 * chars). Returns the code, the deep link and Meta's rendered QR image URL
 * (SVG by default). The prefilled message can be edited later without
 * reprinting the QR.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export async function createQrCode(
  options: PhoneNumberCredential & {
    /** Prefilled message (max 140 chars). */
    prefilledText?: string;
    /** snake_case alias for prefilledText. */
    prefilled_text?: string;
    /** Image format for Meta's hosted qr_image_url. Default: SVG. */
    generateQrImage?: 'SVG' | 'PNG';
  }
): Promise<WhatsAppQrCodeResult> {
  const { phoneNumberId, accessToken, generateQrImage = 'SVG' } = options;
  const data = await graphRequest<WhatsAppQrCode>({
    path: `${phoneNumberId}/message_qrdls`,
    accessToken,
    method: 'POST',
    query: { generate_qr_image: generateQrImage },
    body: { prefilled_message: readPrefilledText(options) },
  });
  return normalizeQrCode(data);
}

/**
 * Update the prefilled message of an existing QR code / short link. Scanned
 * QRs immediately use the new message — no reprinting needed.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export async function updateQrCode(
  options: PhoneNumberCredential & {
    code: string;
    /** New prefilled message (max 140 chars). */
    prefilledText?: string;
    /** snake_case alias for prefilledText. */
    prefilled_text?: string;
    generateQrImage?: 'SVG' | 'PNG';
  }
): Promise<GraphSuccess> {
  const { phoneNumberId, accessToken, code, generateQrImage } = options;
  return graphRequest<GraphSuccess>({
    path: `${phoneNumberId}/message_qrdls/${encodeURIComponent(code)}`,
    accessToken,
    method: 'POST',
    query: generateQrImage !== undefined ? { generate_qr_image: generateQrImage } : undefined,
    body: { prefilled_message: readPrefilledText(options) },
  });
}

/**
 * Delete a QR code / short link.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes
 */
export async function deleteQrCode(
  options: PhoneNumberCredential & { code: string }
): Promise<GraphSuccess> {
  const { phoneNumberId, accessToken, code } = options;
  return graphRequest<GraphSuccess>({
    path: `${phoneNumberId}/message_qrdls/${encodeURIComponent(code)}`,
    accessToken,
    method: 'DELETE',
  });
}

// ─── Local QR generation (qrcode npm package, server-side) ──────────────

export interface QrRenderOptions {
  /** Quiet zone in modules. Default: 2. */
  margin?: number;
  /** Error correction level. Default: 'M'. */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Pixel width (PNG only). Default: 512. */
  width?: number;
}

/**
 * Render any URL (typically a wa.me chat/catalog link from
 * {@link buildChatLink}) into an SVG data URI using the local `qrcode`
 * package — no external QR service. Use the result directly in an
 * `<img src="...">` or download it for print. Runs server-side (Node runtime).
 */
export async function generateQrSvgDataUri(url: string, options: QrRenderOptions = {}): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

/**
 * Render any URL (typically a wa.me link) into a PNG data URI using the
 * local `qrcode` package. Runs server-side (Node runtime).
 */
export async function generateQrPngDataUri(url: string, options: QrRenderOptions = {}): Promise<string> {
  return QRCode.toDataURL(url, {
    type: 'image/png',
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    width: options.width ?? 512,
  });
}

/**
 * Convenience: build a chat link for a business number and render it as a
 * printable QR (SVG data URI by default). The merchant prints it once for
 * counters/tables/packaging; the prefilled message stays editable via the
 * QR API.
 */
export async function generateChatQrDataUri(
  phone: string,
  prefilledText?: string,
  format: 'svg' | 'png' = 'svg'
): Promise<string> {
  const link = buildChatLink(phone, prefilledText);
  return format === 'svg' ? generateQrSvgDataUri(link) : generateQrPngDataUri(link);
}
