// ============================================
// AssistMint — WhatsApp Platform Server Actions
// QR codes, account health, OBA verification,
// analytics, business profile, catalog sync.
// Wraps src/lib/whatsapp/* with restaurant
// ownership checks + activity logging.
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/utils/activity-logger';
import { updateRestaurantSettings } from '@/lib/actions/restaurant-actions';
import {
  fetchConversationAnalytics,
  fetchPhoneNumberHealth,
  fetchPricingAnalytics,
  fetchTemplateAnalytics,
  fetchWabaAnalytics,
} from '@/lib/whatsapp/analytics';
import {
  buildCatalogLink,
  buildChatLink,
  createQrCode,
  generateQrPngDataUri,
  listQrCodes,
  updateQrCode,
} from '@/lib/whatsapp/links';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/whatsapp/business-profile';
import { getFlowHealth } from '@/lib/whatsapp/flows';
import type { FlowsProvisionReport } from '@/lib/flows/auto-setup';
// Type-only re-export for the dashboard card (erased at compile time —
// 'use server' files may only export async functions at runtime).
export type { FlowsProvisionReport } from '@/lib/flows/auto-setup';
import {
  getObaStatus as fetchObaStatus,
  obaEligibilityCheck,
  requestOba as submitObaToMeta,
} from '@/lib/whatsapp/obd';
import {
  ensureCatalog,
  getCatalogId,
  setCommerceSettings,
  upsertCatalogItem,
} from '@/lib/whatsapp/catalog';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// ─── Ownership + credentials ────────────────

type OwnerResult =
  | { ok: true; supabase: SupabaseServerClient; userId: string; row: Record<string, unknown> }
  | { ok: false; error: string; notConnected?: boolean };

/** Verify the signed-in user owns this restaurant. No WhatsApp creds required. */
async function requireOwner(restaurantId: string): Promise<OwnerResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' };

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, owner_id, name, phone, business_config, created_at, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { ok: false, error: 'Restaurant not found' };
  const row = restaurant as Record<string, unknown>;
  if (row.owner_id !== user.id) return { ok: false, error: 'Not authorized' };

  return { ok: true, supabase, userId: user.id, row };
}

type ConnectedResult =
  | {
      ok: true;
      supabase: SupabaseServerClient;
      userId: string;
      phoneNumberId: string;
      wabaId: string | null;
      accessToken: string;
      businessConfig: Record<string, unknown>;
      createdAt: string | null;
      /** Restaurant/business display name (used to name auto-created catalogs). */
      restaurantName: string;
    }
  | { ok: false; error: string; notConnected?: boolean };

/** Verify ownership AND that WhatsApp is connected (phone id + token present). */
async function requireConnected(restaurantId: string): Promise<ConnectedResult> {
  const owner = await requireOwner(restaurantId);
  if (!owner.ok) return owner;

  const phoneNumberId = String(owner.row.whatsapp_phone_id || '');
  const accessToken = String(owner.row.whatsapp_access_token || '');
  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      error: 'WhatsApp is not connected. Connect your number in Settings → WhatsApp first.',
      notConnected: true,
    };
  }

  const rawConfig = owner.row.business_config;
  return {
    ok: true,
    supabase: owner.supabase,
    userId: owner.userId,
    phoneNumberId,
    wabaId: owner.row.whatsapp_waba_id ? String(owner.row.whatsapp_waba_id) : null,
    accessToken,
    businessConfig:
      rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
        ? (rawConfig as Record<string, unknown>)
        : {},
    createdAt: owner.row.created_at ? String(owner.row.created_at) : null,
    restaurantName: owner.row.name ? String(owner.row.name) : '',
  };
}

// ─── Defensive normalizers ──────────────────
// The lib modules return Graph API shapes; these helpers coerce the common
// variants (raw array, {data:[]}, {analytics:{dataPoints:[]}}) into stable
// client-facing types without `any`.

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapGraph(value: unknown): Record<string, unknown> {
  let rec = asRecord(value);
  const inner = rec.data;
  if (Array.isArray(inner) && inner.length > 0) rec = asRecord(inner[0]);
  else if (inner && typeof inner === 'object') rec = asRecord(inner);
  return rec;
}

function pickArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const rec = asRecord(value);
  if (Array.isArray(rec.data)) return rec.data;
  if (Array.isArray(rec.dataPoints)) return rec.dataPoints;
  if (Array.isArray(rec.data_points)) return rec.data_points;
  if (rec.analytics !== undefined) return pickArray(rec.analytics);
  return [];
}

function str(source: unknown, ...keys: string[]): string {
  const rec = asRecord(source);
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function num(source: unknown, ...keys: string[]): number {
  const rec = asRecord(source);
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Coerce a timestamp-ish field (unix s/ms, ISO string) into a YYYY-MM-DD key. */
function dayKey(source: unknown): string {
  const rec = asRecord(source);
  const raw = rec.start ?? rec.date ?? rec.day ?? rec.t ?? rec.x;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof raw === 'string' && raw !== '') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw.slice(0, 10) : d.toISOString().slice(0, 10);
  }
  return '';
}

// ─── Shared result types ────────────────────

export interface PhoneHealthData {
  quality_rating: string;
  messaging_limit_tier: string;
  verified_name: string;
  name_status: string;
  code_verification_status: string;
  /** Pending display-name change (requested via the site's name edit) */
  new_display_name?: string;
  new_name_status?: string;
  /** REAL send blockers from Meta's Health Status API (per-level) */
  can_send_message?: string;
  blockers?: Array<{
    level: string;
    status: string;
    error_description: string;
    possible_solution: string;
  }>;
  additional_info?: string[];
}

export interface QrCodeItem {
  code: string;
  prefilledText: string;
  /** wa.me/message/<code> short link */
  link: string;
  createdAt: string | null;
}

export interface WhatsAppBusinessProfile {
  about: string;
  address: string;
  description: string;
  email: string;
  vertical: string;
  websites: string[];
  profile_picture_url: string;
}

export interface WhatsAppBusinessProfileInput {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
  profile_picture_url?: string;
}

export interface WaDayPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface WaCategoryPoint {
  category: string;
  conversations: number;
  cost: number;
}

export interface WaTemplateStat {
  name: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface WhatsAppAnalyticsData {
  messaging: WaDayPoint[];
  categories: WaCategoryPoint[];
  costByDay: Array<{ date: string; cost: number }>;
  totalCost: number;
  templates: WaTemplateStat[];
  partialErrors: string[];
}

export interface ChecklistItem {
  label: string;
  /** null = unknown / not checkable via API */
  met: boolean | null;
  /** Extra context from Meta or the eligibility heuristic */
  detail?: string;
}

export interface ObaRequestInput {
  website: string;
  pressUrls: string[];
  country?: string;
  language?: string;
  parentBrand?: string;
}

export interface ShareLinksData {
  phone: string;
  chatLink: string;
  catalogLink: string;
  /** 'whatsapp' = the live connected number; 'restaurant' = the site phone field */
  phoneSource?: 'whatsapp' | 'restaurant';
}

export interface CatalogSyncItemResult {
  name: string;
  status: 'synced' | 'failed';
  error?: string;
}

export interface CatalogSyncResult {
  total: number;
  synced: number;
  failed: number;
  results: CatalogSyncItemResult[];
  commerceSettings: boolean;
  catalogId: string | null;
  lastSyncedAt: string;
  /** True when a catalog was auto-created on Meta during this sync. */
  catalogCreated?: boolean;
}

// ═══════════════════════════════════════════
// ACCOUNT HEALTH
// ═══════════════════════════════════════════

export async function getAccountHealth(
  restaurantId: string
): Promise<{ data: PhoneHealthData | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  try {
    const health = await fetchPhoneNumberHealth({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
    });
    const rec = unwrapGraph(health);

    // Real send blockers + pending display name — the Health Status API is
    // the source of truth when sends fail mysteriously (e.g. 131037 can
    // mask a WABA payment-method block).
    let canSend: string | undefined;
    const blockers: PhoneHealthData['blockers'] = [];
    const additionalInfo: string[] = [];
    try {
      const { getMessagingHealth, getDisplayNameStatus } = await import(
        '@/lib/whatsapp/display-name'
      );
      const [messaging, displayName] = await Promise.all([
        getMessagingHealth({ phoneNumberId: owned.phoneNumberId, accessToken: owned.accessToken }),
        getDisplayNameStatus({ phoneNumberId: owned.phoneNumberId, accessToken: owned.accessToken }),
      ]);
      canSend = messaging.can_send_message;
      for (const entity of messaging.entities || []) {
        for (const err of entity.errors || []) {
          blockers.push({
            level: entity.entity_type,
            status: entity.can_send_message,
            error_description: err.error_description,
            possible_solution: err.possible_solution || '',
          });
        }
        for (const info of entity.additional_info || []) {
          additionalInfo.push(`${entity.entity_type}: ${info}`);
        }
      }
      return {
        data: {
          quality_rating: str(rec, 'quality_rating', 'qualityRating') || 'UNKNOWN',
          messaging_limit_tier: str(rec, 'messaging_limit_tier', 'messagingLimitTier') || 'UNKNOWN',
          verified_name: str(rec, 'verified_name', 'verifiedName'),
          name_status: str(rec, 'name_status', 'nameStatus') || 'UNKNOWN',
          code_verification_status:
            str(rec, 'code_verification_status', 'codeVerificationStatus') || 'UNKNOWN',
          new_display_name: displayName.new_display_name,
          new_name_status: displayName.new_name_status,
          can_send_message: canSend,
          blockers,
          additional_info: additionalInfo.length > 0 ? additionalInfo : undefined,
        },
        error: null,
      };
    } catch {
      // Health Status API unavailable — fall through to the basic read below
    }

    return {
      data: {
        quality_rating: str(rec, 'quality_rating', 'qualityRating') || 'UNKNOWN',
        messaging_limit_tier: str(rec, 'messaging_limit_tier', 'messagingLimitTier') || 'UNKNOWN',
        verified_name: str(rec, 'verified_name', 'verifiedName'),
        name_status: str(rec, 'name_status', 'nameStatus') || 'UNKNOWN',
        code_verification_status:
          str(rec, 'code_verification_status', 'codeVerificationStatus') || 'UNKNOWN',
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: `Could not read account health from Meta: ${errorMessage(err)}` };
  }
}

// ═══════════════════════════════════════════
// OFFICIAL BUSINESS ACCOUNT (OBA)
// ═══════════════════════════════════════════

function normalizeObaStatus(value: unknown): string {
  const rec = unwrapGraph(value);
  const raw =
    str(rec, 'oba_status', 'obaStatus', 'status', 'official_business_account') ||
    (typeof value === 'string' ? value : '');
  return raw.trim().toUpperCase() || 'UNKNOWN';
}

export async function getObaStatus(
  restaurantId: string
): Promise<{ data: { status: string } | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  try {
    const status = await fetchObaStatus({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
    });
    return { data: { status: normalizeObaStatus(status) }, error: null };
  } catch (err) {
    return { data: null, error: `Could not read verification status: ${errorMessage(err)}` };
  }
}

function normalizeChecklist(value: unknown): ChecklistItem[] {
  /** Map the lib's 'pass' | 'fail' | 'unknown' | 'manual' status to a tri-state. */
  const metFromStatus = (status: string): boolean | null => {
    const s = (status || '').toLowerCase();
    if (s === 'pass' || s === 'ok' || s === 'yes' || s === 'true') return true;
    if (s === 'fail' || s === 'failed' || s === 'no' || s === 'false') return false;
    return null;
  };

  const fromArray = (arr: unknown[]): ChecklistItem[] => {
    const out: ChecklistItem[] = [];
    for (const entry of arr) {
      if (typeof entry === 'string') {
        if (entry.trim()) out.push({ label: entry.trim(), met: null });
        continue;
      }
      const rec = asRecord(entry);
      const label = str(rec, 'label', 'name', 'requirement', 'title', 'check');
      if (!label) continue;
      const detail = str(rec, 'detail', 'details', 'description') || undefined;
      const statusMet = metFromStatus(str(rec, 'status', 'state'));
      const met =
        statusMet !== null
          ? statusMet
          : rec.met === true || rec.satisfied === true || rec.isMet === true || rec.passed === true
            ? true
            : rec.met === false || rec.satisfied === false || rec.isMet === false || rec.passed === false
              ? false
              : null;
      out.push({ label, met, detail });
    }
    return out;
  };

  if (Array.isArray(value)) return fromArray(value);

  const rec = asRecord(value);
  if (Array.isArray(rec.checklist)) return fromArray(rec.checklist);
  if (Array.isArray(rec.checks)) return fromArray(rec.checks);

  const out: ChecklistItem[] = [];
  if (typeof rec.eligible === 'boolean') {
    out.push({ label: 'Meets all of Meta\u2019s requirements', met: rec.eligible });
  }
  for (const [key, val] of Object.entries(rec)) {
    if (key === 'eligible' || typeof val !== 'boolean') continue;
    out.push({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      met: val,
    });
  }
  return out;
}

export async function checkObaEligibility(
  restaurantId: string
): Promise<{ data: { checklist: ChecklistItem[] } | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  try {
    const checklist = await obaEligibilityCheck({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      // Days-on-platform is computed from when the business joined AssistMint
      registeredAt: owned.createdAt || undefined,
    });
    return { data: { checklist: normalizeChecklist(checklist) }, error: null };
  } catch (err) {
    return { data: null, error: `Could not check eligibility: ${errorMessage(err)}` };
  }
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function requestOba(
  restaurantId: string,
  request: ObaRequestInput
): Promise<{ success: boolean; error: string | null }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { success: false, error: owned.error };

  const website = (request.website || '').trim();
  if (!isValidUrl(website)) {
    return { success: false, error: 'Enter a valid website URL (https://…)' };
  }

  const pressUrls = (request.pressUrls || [])
    .map((u) => (u || '').trim())
    .filter((u) => u !== '');
  if (pressUrls.some((u) => !isValidUrl(u))) {
    return { success: false, error: 'One or more press links are not valid URLs.' };
  }
  if (pressUrls.length < 1) {
    return { success: false, error: 'Add at least 1 press link — Meta requires evidence of notability.' };
  }
  if (pressUrls.length > 5) {
    return { success: false, error: 'You can attach at most 5 press links.' };
  }

  try {
    await submitObaToMeta({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      website,
      country: (request.country || 'IN').trim().toUpperCase(),
      language: (request.language || 'en').trim().toLowerCase(),
      pressUrls,
      parentBrand: (request.parentBrand || '').trim() || undefined,
    });
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: owned.userId,
      action: 'whatsapp.oba_requested',
      details: { website, pressLinks: pressUrls.length },
    });
    revalidatePath('/dashboard/settings');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: `Meta rejected the request: ${errorMessage(err)}` };
  }
}

// ═══════════════════════════════════════════
// QR CODES & SHORT LINKS
// ═══════════════════════════════════════════

function normalizeQr(value: unknown): QrCodeItem | null {
  const rec = unwrapGraph(value);
  const code = str(rec, 'code', 'qr_code_id', 'id');
  if (!code) return null;
  return {
    code,
    prefilledText: str(rec, 'prefilled_message', 'prefilledText', 'prefilled_text', 'message'),
    link:
      str(rec, 'deepLinkUrl', 'deep_link_url', 'link', 'url') ||
      `https://wa.me/message/${code}`,
    createdAt: str(rec, 'created_at', 'createdAt', 'created_time') || null,
  };
}

export async function getQrCodes(
  restaurantId: string
): Promise<{ data: QrCodeItem[] | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  try {
    const result = await listQrCodes({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
    });
    const items = pickArray(result)
      .map(normalizeQr)
      .filter((item): item is QrCodeItem => item !== null);
    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: `Could not load your QR codes: ${errorMessage(err)}` };
  }
}

export async function createQr(
  restaurantId: string,
  prefilledText: string
): Promise<{ data: QrCodeItem | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  const text = (prefilledText || '').trim();
  if (!text) return { data: null, error: 'Write the message customers will send when they scan.' };
  if (text.length > 140) return { data: null, error: 'The pre-filled message is limited to 140 characters.' };

  try {
    const created = await createQrCode({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      prefilledText: text,
      generateQrImage: 'PNG',
    });
    const item = normalizeQr(created);
    if (!item) return { data: null, error: 'Meta created the QR but returned an unexpected response. Refresh the list.' };
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: owned.userId,
      action: 'whatsapp.qr_created',
      details: { code: item.code, prefilledText: text },
    });
    revalidatePath('/dashboard/qr');
    return { data: item, error: null };
  } catch (err) {
    return { data: null, error: `Could not create the QR code: ${errorMessage(err)}` };
  }
}

export async function updateQr(
  restaurantId: string,
  code: string,
  prefilledText: string
): Promise<{ data: QrCodeItem | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  const cleanCode = (code || '').trim();
  const text = (prefilledText || '').trim();
  if (!cleanCode) return { data: null, error: 'Missing QR code.' };
  if (!text) return { data: null, error: 'The pre-filled message cannot be empty.' };
  if (text.length > 140) return { data: null, error: 'The pre-filled message is limited to 140 characters.' };

  try {
    await updateQrCode({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      code: cleanCode,
      prefilledText: text,
    });
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: owned.userId,
      action: 'whatsapp.qr_updated',
      details: { code: cleanCode },
    });
    revalidatePath('/dashboard/qr');
    return {
      data: { code: cleanCode, prefilledText: text, link: `https://wa.me/message/${cleanCode}`, createdAt: null },
      error: null,
    };
  } catch (err) {
    return { data: null, error: `Could not update the QR code: ${errorMessage(err)}` };
  }
}

/** Render a scannable PNG (data URI) for any text — typically a wa.me link. */
export async function generateQr(
  restaurantId: string,
  text: string
): Promise<{ data: string | null; error: string | null }> {
  const owned = await requireOwner(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error };

  const clean = (text || '').trim();
  if (!clean) return { data: null, error: 'Nothing to encode.' };

  try {
    const dataUri = await generateQrPngDataUri(clean);
    if (!dataUri || typeof dataUri !== 'string') {
      return { data: null, error: 'QR image could not be generated.' };
    }
    return { data: dataUri, error: null };
  } catch (err) {
    return { data: null, error: `QR image failed: ${errorMessage(err)}` };
  }
}

// ═══════════════════════════════════════════
// BUSINESS PROFILE
// ═══════════════════════════════════════════

export async function getBusinessProfileFor(
  restaurantId: string
): Promise<{ data: WhatsAppBusinessProfile | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  try {
    const profile = await getBusinessProfile({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
    });
    const rec = unwrapGraph(profile);
    const websitesRaw = rec.websites;
    const websites = Array.isArray(websitesRaw)
      ? websitesRaw.filter((w): w is string => typeof w === 'string')
      : [];
    return {
      data: {
        about: str(rec, 'about'),
        address: str(rec, 'address'),
        description: str(rec, 'description'),
        email: str(rec, 'email'),
        vertical: str(rec, 'vertical'),
        websites,
        profile_picture_url: str(rec, 'profile_picture_url', 'profilePictureUrl'),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: `Could not load your WhatsApp profile: ${errorMessage(err)}` };
  }
}

export async function updateBusinessProfileFor(
  restaurantId: string,
  profile: WhatsAppBusinessProfileInput
): Promise<{ success: boolean; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { success: false, error: owned.error, notConnected: owned.notConnected };

  // Build a clean payload — only fields the owner actually filled in.
  const payload: WhatsAppBusinessProfileInput = {};
  const about = (profile.about || '').trim();
  if (about) payload.about = about.slice(0, 139);
  const address = (profile.address || '').trim();
  if (address) payload.address = address.slice(0, 256);
  const description = (profile.description || '').trim();
  if (description) payload.description = description.slice(0, 512);
  const email = (profile.email || '').trim();
  if (email) payload.email = email.slice(0, 128);
  const vertical = (profile.vertical || '').trim();
  if (vertical) payload.vertical = vertical;
  const websites = (profile.websites || [])
    .map((w) => (w || '').trim())
    .filter((w) => w !== '')
    .slice(0, 2);
  if (websites.length > 0) payload.websites = websites;
  const picture = (profile.profile_picture_url || '').trim();
  if (picture) payload.profile_picture_url = picture;

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'Nothing to update — fill in at least one field.' };
  }

  try {
    await updateBusinessProfile({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      ...payload,
    });
    logActivity({
      restaurantId,
      actorType: 'owner',
      actorId: owned.userId,
      action: 'whatsapp.business_profile_updated',
      details: { fields: Object.keys(payload) },
    });
    revalidatePath('/dashboard/settings');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: `Could not update your WhatsApp profile: ${errorMessage(err)}` };
  }
}

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════

function normalizeMessaging(value: unknown): WaDayPoint[] {
  const points: WaDayPoint[] = [];
  for (const raw of pickArray(value)) {
    const rec = asRecord(raw);
    const nested = Array.isArray(rec.data_points) ? rec.data_points : [raw];
    for (const point of nested) {
      const date = dayKey(point);
      const sent = num(point, 'sent', 'SENT', 'messages_sent', 'total_sent');
      const delivered = num(point, 'delivered', 'DELIVERED');
      const read = num(point, 'read', 'READ', 'read_count');
      if (!date && !sent && !delivered && !read) continue;
      const existing = points.find((p) => p.date === date);
      if (existing) {
        existing.sent += sent;
        existing.delivered += delivered;
        existing.read += read;
      } else {
        points.push({ date, sent, delivered, read });
      }
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeCategories(value: unknown): WaCategoryPoint[] {
  const map = new Map<string, WaCategoryPoint>();
  for (const raw of pickArray(value)) {
    const rec = asRecord(raw);
    const nested = Array.isArray(rec.data_points) ? rec.data_points : [raw];
    const category = (
      str(raw, 'conversation_category', 'category', 'pricing_category', 'conversation_type') || 'unknown'
    ).toUpperCase();
    for (const point of nested) {
      const conversations = num(point, 'conversation', 'conversations', 'count');
      const cost = num(point, 'cost');
      const existing = map.get(category) || { category, conversations: 0, cost: 0 };
      existing.conversations += conversations;
      existing.cost += cost;
      map.set(category, existing);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.conversations - a.conversations);
}

function normalizeCostByDay(value: unknown): Array<{ date: string; cost: number }> {
  const map = new Map<string, number>();
  for (const raw of pickArray(value)) {
    const rec = asRecord(raw);
    const nested = Array.isArray(rec.data_points) ? rec.data_points : [raw];
    for (const point of nested) {
      const date = dayKey(point);
      const cost = num(point, 'cost', 'estimated_cost', 'total_cost');
      if (!date) continue;
      map.set(date, (map.get(date) || 0) + cost);
    }
  }
  return Array.from(map.entries())
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeTemplates(value: unknown): WaTemplateStat[] {
  const stats: WaTemplateStat[] = [];
  for (const raw of pickArray(value)) {
    const rec = asRecord(raw);
    const name = str(raw, 'template_name', 'name', 'template');
    if (!name) continue;
    let sent = num(raw, 'sent', 'SENT');
    let delivered = num(raw, 'delivered', 'DELIVERED');
    let read = num(raw, 'read', 'READ');
    const nested = Array.isArray(rec.data_points) ? rec.data_points : null;
    if (nested && !sent && !delivered && !read) {
      for (const point of nested) {
        sent += num(point, 'sent', 'SENT');
        delivered += num(point, 'delivered', 'DELIVERED');
        read += num(point, 'read', 'READ');
      }
    }
    stats.push({ name, sent, delivered, read });
  }
  return stats.sort((a, b) => b.sent - a.sent);
}

export async function getAnalytics(
  restaurantId: string,
  days = 30
): Promise<{ data: WhatsAppAnalyticsData | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };
  if (!owned.wabaId) {
    return {
      data: null,
      error: 'Your WhatsApp Business Account (WABA) ID is missing. Reconnect WhatsApp in Settings → WhatsApp to enable analytics.',
    };
  }

  const clampedDays = Math.min(Math.max(days, 1), 90);
  const end = new Date();
  const start = new Date(end.getTime() - clampedDays * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const partialErrors: string[] = [];
  const [messagingRes, convoRes, pricingRes, templateRes] = await Promise.allSettled([
    fetchWabaAnalytics({
      wabaId: owned.wabaId,
      accessToken: owned.accessToken,
      start: startIso,
      end: endIso,
      granularity: 'DAY',
    }),
    fetchConversationAnalytics({
      wabaId: owned.wabaId,
      accessToken: owned.accessToken,
      start: startIso,
      end: endIso,
      granularity: 'DAY',
    }),
    fetchPricingAnalytics({
      wabaId: owned.wabaId,
      accessToken: owned.accessToken,
      start: startIso,
      end: endIso,
      granularity: 'DAY',
    }),
    fetchTemplateAnalytics({
      wabaId: owned.wabaId,
      accessToken: owned.accessToken,
      start: startIso,
      end: endIso,
    }),
  ]);

  let messaging: WaDayPoint[] = [];
  let categories: WaCategoryPoint[] = [];
  let costByDay: Array<{ date: string; cost: number }> = [];
  let templates: WaTemplateStat[] = [];

  if (messagingRes.status === 'fulfilled') messaging = normalizeMessaging(messagingRes.value);
  else partialErrors.push(`Messaging data unavailable: ${errorMessage(messagingRes.reason)}`);

  if (convoRes.status === 'fulfilled') categories = normalizeCategories(convoRes.value);
  else partialErrors.push(`Conversation data unavailable: ${errorMessage(convoRes.reason)}`);

  if (pricingRes.status === 'fulfilled') costByDay = normalizeCostByDay(pricingRes.value);
  else partialErrors.push(`Pricing data unavailable: ${errorMessage(pricingRes.reason)}`);

  if (templateRes.status === 'fulfilled') templates = normalizeTemplates(templateRes.value);
  else partialErrors.push(`Template data unavailable: ${errorMessage(templateRes.reason)}`);

  const totalCost = costByDay.reduce((sum, d) => sum + d.cost, 0);

  return {
    data: { messaging, categories, costByDay, totalCost, templates, partialErrors },
    error: null,
  };
}

// ═══════════════════════════════════════════
// SHARE LINKS (wa.me)
// ═══════════════════════════════════════════

export async function getShareLinks(
  restaurantId: string
): Promise<{ data: ShareLinksData | null; error: string | null }> {
  const owned = await requireOwner(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error };

  // Prefer the CONNECTED WhatsApp number (what Meta actually answers on) —
  // the site's phone field can differ from the number linked via embedded
  // signup, and wa.me links must open the chat the bot is watching.
  let digits = '';
  let phoneSource: 'whatsapp' | 'restaurant' = 'restaurant';

  const waPhoneId = String(owned.row.whatsapp_phone_id || '');
  const waToken = String(owned.row.whatsapp_access_token || '');
  if (waPhoneId && waToken) {
    try {
      const { fetchPhoneNumberHealth } = await import('@/lib/whatsapp/analytics');
      const health = await fetchPhoneNumberHealth({
        phoneNumberId: waPhoneId,
        accessToken: waToken,
      });
      const rec = unwrapGraph(health) as Record<string, unknown>;
      const connected = String(rec.display_phone_number || '').replace(/\D/g, '');
      if (connected.length >= 11) {
        digits = connected;
        phoneSource = 'whatsapp';
      }
    } catch {
      // Fall back to the restaurant phone below
    }
  }

  if (!digits) {
    const rawPhone = String(owned.row.phone || '').trim();
    if (!rawPhone) {
      return {
        data: null,
        error: 'Add your business phone number (with country code) in Settings → Restaurant first.',
      };
    }
    digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`; // default to India
    if (digits.length < 11) {
      return {
        data: null,
        error: 'That phone number looks too short — include the country code (e.g. +91…).',
      };
    }
  }

  try {
    return {
      data: {
        phone: digits,
        phoneSource,
        chatLink: buildChatLink(digits, 'Hi'),
        catalogLink: buildCatalogLink(digits),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: `Could not build links: ${errorMessage(err)}` };
  }
}

// ═══════════════════════════════════════════
// CATALOG SYNC
// ═══════════════════════════════════════════

interface SyncMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string | null;
  image_url: string | null;
}

export async function syncCatalogToMeta(
  restaurantId: string
): Promise<{
  data: CatalogSyncResult | null;
  error: string | null;
  notConnected?: boolean;
  /** True when no catalog exists and Meta blocked auto-creation — the owner is guided through Commerce Manager. */
  needsCatalogSetup?: boolean;
}> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };
  if (!owned.wabaId) {
    return {
      data: null,
      error: 'Your WhatsApp Business Account (WABA) ID is missing. Reconnect WhatsApp in Settings → WhatsApp first.',
    };
  }

  // Active menu items (prices stored in paise)
  const { data: items, error: itemsError } = await owned.supabase
    .from('menu_items')
    .select('id, name, description, price, image_url')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)
    .order('display_order', { ascending: true });

  if (itemsError) return { data: null, error: `Could not read your menu: ${itemsError.message}` };

  const menuItems = ((items || []) as unknown[]).map((raw) => asRecord(raw)).filter((rec) => str(rec, 'id'));
  if (menuItems.length === 0) {
    return {
      data: {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
        commerceSettings: false,
        catalogId: null,
        lastSyncedAt: new Date().toISOString(),
      },
      error: null,
    };
  }

  // Locate the WABA's catalog (returns null when none is connected) —
  // auto-create one on the WABA's owning business when missing.
  let catalogId: string | null = null;
  try {
    catalogId = await getCatalogId({
      wabaId: owned.wabaId,
      accessToken: owned.accessToken,
    });
  } catch (err) {
    return {
      data: null,
      error: `Could not find a WhatsApp catalog for your account: ${errorMessage(err)}`,
    };
  }

  let catalogCreated = false;
  if (!catalogId) {
    let ensured: Awaited<ReturnType<typeof ensureCatalog>> | null = null;
    try {
      ensured = await ensureCatalog({
        wabaId: owned.wabaId,
        accessToken: owned.accessToken,
        name: owned.restaurantName || 'Our Business',
      });
    } catch (err) {
      ensured = null;
      console.warn('[syncCatalogToMeta] ensureCatalog threw:', err);
    }
    if (ensured?.error) {
      console.warn('[syncCatalogToMeta] ensureCatalog reported:', ensured.error);
    }
    catalogId = ensured?.catalogId ?? null;
    catalogCreated = ensured?.created ?? false;

    if (!catalogId) {
      // Remember that setup is pending so the dashboard can show the
      // step-by-step Commerce Manager guide until a sync succeeds.
      await updateRestaurantSettings(restaurantId, {
        business_config: { ...owned.businessConfig, catalog_setup_needed: true },
      });
      const verbatim = ensured?.error ? ` (Meta said: ${ensured.error})` : '';
      return {
        data: null,
        error: `Your WhatsApp catalog needs to be created once on Meta's website before we can sync your menu.${verbatim}`,
        needsCatalogSetup: true,
      };
    }
  }

  const results: CatalogSyncItemResult[] = [];

  for (const rec of menuItems) {
    const item: SyncMenuItem = {
      id: str(rec, 'id'),
      name: str(rec, 'name'),
      description: str(rec, 'description') || null,
      price: (rec.price as number | string | null) ?? null,
      image_url: str(rec, 'image_url') || null,
    };
    if (!item.id || !item.name) continue;

    try {
      // Upsert keyed on the menu item id — re-syncs update instead of
      // duplicating. Prices use the smallest currency unit (our menu stores
      // paise, which is exactly what Meta wants for INR).
      await upsertCatalogItem({
        catalogId,
        accessToken: owned.accessToken,
        item: {
          retailerId: item.id,
          name: item.name,
          description: item.description || item.name,
          price: Math.round(Number(item.price || 0)),
          currency: 'INR',
          imageUrl: item.image_url || undefined,
          availability: 'IN_STOCK',
        },
      });
      results.push({ name: item.name, status: 'synced' });
    } catch (err) {
      results.push({ name: item.name, status: 'failed', error: errorMessage(err) });
    }
  }

  // Best-effort: enable the in-chat cart + catalog visibility
  let commerceSettings = false;
  try {
    await setCommerceSettings({
      phoneNumberId: owned.phoneNumberId,
      accessToken: owned.accessToken,
      cartEnabled: true,
      catalogVisible: true,
    });
    commerceSettings = true;
  } catch {
    // Not fatal — items still synced
  }

  const syncedCount = results.filter((r) => r.status === 'synced').length;
  const failedCount = results.length - syncedCount;
  const lastSyncedAt = new Date().toISOString();

  // Persist catalog id + last-sync time + summary into business_config
  // (merge, not replace) and clear the manual-setup flag — the catalog now
  // exists and is connected.
  const mergedConfig: Record<string, unknown> = {
    ...owned.businessConfig,
    catalog_id: catalogId,
    catalog_setup_needed: false,
    last_catalog_sync_at: lastSyncedAt,
    last_catalog_sync_summary: { total: results.length, synced: syncedCount, failed: failedCount },
  };
  await updateRestaurantSettings(restaurantId, { business_config: mergedConfig });

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: owned.userId,
    action: 'whatsapp.catalog_synced',
    details: { synced: syncedCount, failed: failedCount, catalogId, catalogCreated },
  });
  revalidatePath('/dashboard/settings');

  return {
    data: {
      total: results.length,
      synced: syncedCount,
      failed: failedCount,
      results,
      commerceSettings,
      catalogId,
      lastSyncedAt,
      catalogCreated,
    },
    error: null,
  };
}

// ═══════════════════════════════════════════
// WHATSAPP FLOWS (zero-manual provisioning)
// ═══════════════════════════════════════════

export interface FlowsStatusData {
  /** business_config.flow_appointment_id — null when never provisioned. */
  flowId: string | null;
  /** Coarse pill state for the health card. */
  status: 'provisioned' | 'publishing' | 'not_set' | 'unknown';
  /** Flow name on the WABA ('AssistMint Booking' when a flow id exists). */
  flowName: string | null;
  /** Raw Meta publish status (PUBLISHED / PUBLISHING / DRAFT / BLOCKED / …). */
  publishStatus: string | null;
  /** Meta endpoint health (GREEN / YELLOW / RED), when readable. */
  healthStatus: string | null;
  healthDescription: string | null;
  /** business_config.flows_provisioned_at (ISO). */
  provisionedAt: string | null;
}

/** Read the restaurant's WhatsApp Flows state (ownership-checked). */
export async function getFlowsStatus(
  restaurantId: string
): Promise<{ data: FlowsStatusData | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };

  const flowIdRaw = owned.businessConfig.flow_appointment_id;
  const flowId = typeof flowIdRaw === 'string' && flowIdRaw.trim() ? flowIdRaw.trim() : null;
  const provisionedAtRaw = owned.businessConfig.flows_provisioned_at;
  const provisionedAt = typeof provisionedAtRaw === 'string' ? provisionedAtRaw : null;

  if (!flowId) {
    return {
      data: {
        flowId: null,
        status: 'not_set',
        flowName: null,
        publishStatus: null,
        healthStatus: null,
        healthDescription: null,
        provisionedAt,
      },
      error: null,
    };
  }

  // Publish status + endpoint health — each best-effort so one failing Graph
  // call (e.g. App Review pending) doesn't blank the whole card.
  let publishStatus: string | null = null;
  let healthStatus: string | null = null;
  let healthDescription: string | null = null;
  const partialErrors: string[] = [];

  try {
    const { getFlowStatus } = await import('@/lib/flows/publish');
    publishStatus = await getFlowStatus(flowId, owned.accessToken);
  } catch (err) {
    partialErrors.push(`Could not read the flow's publish status: ${errorMessage(err)}`);
  }

  try {
    const health = await getFlowHealth({ flowId, accessToken: owned.accessToken });
    healthStatus = health.healthStatus;
    healthDescription = health.healthStatusDescription;
  } catch (err) {
    partialErrors.push(`Could not read the flow's endpoint health: ${errorMessage(err)}`);
  }

  let status: FlowsStatusData['status'];
  if (publishStatus === 'PUBLISHED') status = 'provisioned';
  else if (publishStatus === 'PUBLISHING' || publishStatus === 'DRAFT') status = 'publishing';
  else if (publishStatus === null) status = 'unknown';
  else status = 'unknown'; // BLOCKED / THROTTLED / DEPRECATED / … — show raw below

  return {
    data: {
      flowId,
      status,
      flowName: 'AssistMint Booking',
      publishStatus,
      healthStatus,
      healthDescription,
      provisionedAt,
    },
    error: partialErrors.length > 0 ? partialErrors.join(' · ') : null,
  };
}

/**
 * Run the zero-manual Flows provisioning now (keypair → public key →
 * appointment flow → publish → persist). Returns the per-step report;
 * ensureFlowsProvisioned never throws and logs 'whatsapp.flows_provisioned'.
 */
export async function provisionFlows(
  restaurantId: string
): Promise<{ data: FlowsProvisionReport | null; error: string | null; notConnected?: boolean }> {
  const owned = await requireConnected(restaurantId);
  if (!owned.ok) return { data: null, error: owned.error, notConnected: owned.notConnected };
  if (!owned.wabaId) {
    return {
      data: null,
      error: 'Your WhatsApp Business Account (WABA) ID is missing. Reconnect WhatsApp in Settings → WhatsApp first.',
    };
  }

  try {
    const { ensureFlowsProvisioned } = await import('@/lib/flows/auto-setup');
    const report = await ensureFlowsProvisioned(restaurantId);
    revalidatePath('/dashboard/settings');
    return { data: report, error: null };
  } catch (err) {
    return { data: null, error: `Provisioning failed: ${errorMessage(err)}` };
  }
}
