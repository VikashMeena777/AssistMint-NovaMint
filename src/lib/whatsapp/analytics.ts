// ============================================
// AssistMint — WhatsApp analytics & account health
// ============================================
// WABA messaging analytics, conversation analytics, pricing analytics,
// template analytics and per-phone-number health (quality rating, messaging
// tier). Poll nightly and store for merchant dashboards.
// Lookback limits: 1 year for messaging/conversation/pricing, 90 days for
// template analytics.
//
// Each fetch returns BOTH a typed summary (e.g. `sent`, `total`, `cost`,
// `templates`) and the normalized per-bucket `data` points, so callers can
// chart trends without re-parsing Graph payloads.

import { graphRequest } from './shared';
import type { PhoneNumberCredential, WabaCredential } from './types';

/** Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics */
export type AnalyticsGranularity = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

/**
 * Time window for analytics queries. `start`/`end` accept `YYYY-MM-DD`,
 * full ISO timestamps (converted to Unix seconds) or numeric strings.
 */
export interface AnalyticsWindow {
  start: string;
  end: string;
  granularity?: AnalyticsGranularity;
}

/** Normalize a start/end value for Graph field modifiers: dates pass through, datetimes become Unix seconds. */
function normalizeTimeBound(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d+$/.test(value)) return value;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return String(Math.floor(parsed / 1000));
  return value;
}

function numFrom(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function strFrom(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/** One messaging-analytics bucket (per granularity window). */
export interface WabaAnalyticsDataPoint {
  start: number;
  end: number;
  sent: number;
  delivered: number;
  read: number;
}

/** WABA messaging analytics: summary + per-bucket points. */
export interface WabaAnalytics {
  /** Total messages sent in the window. */
  sent: number;
  /** Total messages delivered in the window. */
  delivered: number;
  /** Total messages read in the window (0 when Meta doesn't report reads). */
  read: number;
  data: WabaAnalyticsDataPoint[];
}

/** One conversation-analytics bucket, flattened per category. */
export interface ConversationAnalyticsDataPoint {
  start: number;
  end: number;
  /** Conversation category, e.g. MARKETING, UTILITY, AUTHENTICATION, SERVICE. */
  conversation_category: string;
  conversations: number;
  cost: number;
}

/** Conversation analytics: summary + per-category buckets. */
export interface ConversationAnalytics {
  /** Total conversations across all categories. */
  total: number;
  /** Conversations per category, e.g. { MARKETING: 12, SERVICE: 40 }. */
  byCategory: Record<string, number>;
  /** Total cost across the window (omitted/0 for shared-credit WABAs). */
  cost: number;
  data: ConversationAnalyticsDataPoint[];
}

/** One pricing-analytics bucket, flattened per pricing category. */
export interface PricingAnalyticsDataPoint {
  start: number;
  end: number;
  pricing_category?: string;
  country?: string;
  phone?: string;
  /** Sum of charges for the bucket (0 when hidden for shared-credit WABAs). */
  cost: number;
  /** Sum of charged message volume for the bucket. */
  volume: number;
  charges: Array<{ charge?: number; volume?: number; type?: string }>;
}

/** Pricing analytics: summary + per-bucket points. */
export interface PricingAnalytics {
  cost: number;
  volume: number;
  data: PricingAnalyticsDataPoint[];
}

/** One template-analytics bucket, flattened per template. */
export interface TemplateAnalyticsDataPoint {
  start: number;
  end: number;
  template_name?: string;
  template_language?: string;
  sent: number;
  delivered: number;
  read: number;
}

/** Per-template performance rollup. */
export interface TemplateStat {
  template_name: string;
  template_language?: string;
  sent: number;
  delivered: number;
  read: number;
}

/** Template analytics (90-day lookback): per-template rollups + buckets. */
export interface TemplateAnalytics {
  templates: TemplateStat[];
  data: TemplateAnalyticsDataPoint[];
}

/** Health snapshot of a business phone number (Graph field names). */
export interface PhoneNumberHealth {
  id: string;
  verified_name: string | null;
  /** GREEN | YELLOW | RED | NA | UNKNOWN. */
  quality_rating: string | null;
  /** TIER_250 | TIER_1K | TIER_10K | TIER_100K | TIER_UNLIMITED. */
  messaging_limit_tier: string | null;
  name_status: string | null;
  code_verification_status: string | null;
}

/** Encode a JS array of strings as a Graph field-modifier argument: ["A","B"]. */
function graphList(values: string[]): string {
  return `[${values.map((value) => `"${value}"`).join(',')}]`;
}

function sumRecords(records: unknown[]): Array<Record<string, unknown>> {
  return records.map((value) => asRecord(value) ?? {});
}

/**
 * Fetch WABA messaging analytics (sent/delivered/read message volume) via
 * `GET /{wabaId}?fields=analytics.start(..).end(..).granularity(..)`.
 * Lookback is capped at 1 year.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics
 */
export async function fetchWabaAnalytics(
  options: WabaCredential & AnalyticsWindow
): Promise<WabaAnalytics> {
  const { wabaId, accessToken, start, end, granularity = 'DAY' } = options;
  const response = await graphRequest<{ analytics?: { data?: unknown[] } }>({
    path: wabaId,
    accessToken,
    query: {
      fields: `analytics.start(${normalizeTimeBound(start)}).end(${normalizeTimeBound(end)}).granularity(${granularity})`,
    },
  });

  const data: WabaAnalyticsDataPoint[] = sumRecords(response.analytics?.data ?? []).map((point) => ({
    start: numFrom(point, ['start']),
    end: numFrom(point, ['end']),
    sent: numFrom(point, ['sent', 'sent_messages', 'messages_sent', 'total_sent']),
    delivered: numFrom(point, ['delivered', 'delivered_messages', 'total_delivered']),
    read: numFrom(point, ['read', 'read_messages', 'read_count']),
  }));

  return {
    sent: data.reduce((sum, point) => sum + point.sent, 0),
    delivered: data.reduce((sum, point) => sum + point.delivered, 0),
    read: data.reduce((sum, point) => sum + point.read, 0),
    data,
  };
}

/**
 * Fetch conversation analytics (volume and cost by conversation category,
 * country and phone) via the `conversation_analytics` field.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics
 */
export async function fetchConversationAnalytics(
  options: WabaCredential &
    AnalyticsWindow & {
      dimensions?: string[];
    }
): Promise<ConversationAnalytics> {
  const {
    wabaId,
    accessToken,
    start,
    end,
    granularity = 'DAY',
    dimensions = ['CONVERSATION_CATEGORY', 'COUNTRY', 'PHONE'],
  } = options;
  const response = await graphRequest<{ conversation_analytics?: { data?: unknown[] } }>({
    path: wabaId,
    accessToken,
    query: {
      fields: `conversation_analytics.start(${normalizeTimeBound(start)}).end(${normalizeTimeBound(end)}).granularity(${granularity}).dimensions(${graphList(dimensions)})`,
    },
  });

  const data: ConversationAnalyticsDataPoint[] = [];
  for (const raw of sumRecords(response.conversation_analytics?.data ?? [])) {
    const startAt = numFrom(raw, ['start']);
    const endAt = numFrom(raw, ['end']);
    const nestedCategories = Array.isArray(raw.conversation_categories)
      ? sumRecords(raw.conversation_categories)
      : null;

    if (nestedCategories && nestedCategories.length > 0) {
      for (const category of nestedCategories) {
        data.push({
          start: startAt,
          end: endAt,
          conversation_category: strFrom(category, ['conversation_category']) ?? 'UNKNOWN',
          conversations: numFrom(category, ['conversations', 'conversation', 'count']),
          cost: numFrom(category, ['cost', 'estimated_cost']),
        });
      }
    } else {
      data.push({
        start: startAt,
        end: endAt,
        conversation_category:
          strFrom(raw, ['conversation_category', 'category', 'conversation_type']) ?? 'UNKNOWN',
        conversations: numFrom(raw, ['conversations', 'conversation', 'count']),
        cost: numFrom(raw, ['cost', 'estimated_cost']),
      });
    }
  }

  const byCategory: Record<string, number> = {};
  for (const point of data) {
    byCategory[point.conversation_category] =
      (byCategory[point.conversation_category] ?? 0) + point.conversations;
  }

  return {
    total: data.reduce((sum, point) => sum + point.conversations, 0),
    byCategory,
    cost: data.reduce((sum, point) => sum + point.cost, 0),
    data,
  };
}

/**
 * Fetch pricing analytics (per-message cost and volume by pricing category,
 * country, phone and tier). COST is omitted for WABAs that share a Solution
 * Partner's credit line.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics
 */
export async function fetchPricingAnalytics(
  options: WabaCredential &
    AnalyticsWindow & {
      dimensions?: string[];
    }
): Promise<PricingAnalytics> {
  const {
    wabaId,
    accessToken,
    start,
    end,
    granularity = 'MONTH',
    dimensions = ['PRICING_CATEGORY', 'COUNTRY', 'PHONE'],
  } = options;
  const response = await graphRequest<{ pricing_analytics?: { data?: unknown[] } }>({
    path: wabaId,
    accessToken,
    query: {
      fields: `pricing_analytics.start(${normalizeTimeBound(start)}).end(${normalizeTimeBound(end)}).granularity(${granularity}).dimensions(${graphList(dimensions)})`,
    },
  });

  const data: PricingAnalyticsDataPoint[] = sumRecords(response.pricing_analytics?.data ?? []).map(
    (point) => {
      const charges = Array.isArray(point.charges)
        ? sumRecords(point.charges).map((charge) => ({
            charge: typeof charge.charge === 'number' ? charge.charge : undefined,
            volume: typeof charge.volume === 'number' ? charge.volume : undefined,
            type: typeof charge.type === 'string' ? charge.type : undefined,
          }))
        : [];
      return {
        start: numFrom(point, ['start']),
        end: numFrom(point, ['end']),
        pricing_category: strFrom(point, ['pricing_category']),
        country: strFrom(point, ['country']),
        phone: strFrom(point, ['phone']),
        cost:
          numFrom(point, ['cost', 'total_cost', 'estimated_cost']) ||
          charges.reduce((sum, charge) => sum + (charge.charge ?? 0), 0),
        volume: charges.reduce((sum, charge) => sum + (charge.volume ?? 0), 0),
        charges,
      };
    }
  );

  return {
    cost: data.reduce((sum, point) => sum + point.cost, 0),
    volume: data.reduce((sum, point) => sum + point.volume, 0),
    data,
  };
}

/**
 * Fetch template analytics — sent/delivered/read counts and button clicks
 * per template (90-day lookback). Pass `templateIds` to scope to specific
 * templates, otherwise all templates are returned.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics
 */
export async function fetchTemplateAnalytics(
  options: WabaCredential & {
    start: string;
    end: string;
    granularity?: AnalyticsGranularity;
    templateIds?: string[];
  }
): Promise<TemplateAnalytics> {
  const { wabaId, accessToken, start, end, granularity = 'DAY', templateIds } = options;

  let field = `template_analytics.start(${normalizeTimeBound(start)}).end(${normalizeTimeBound(end)}).granularity(${granularity}).dimensions(${graphList(['TEMPLATE_NAME', 'TEMPLATE_LANGUAGE'])})`;
  if (templateIds && templateIds.length > 0) {
    field += `.template_ids(${graphList(templateIds)})`;
  }

  const response = await graphRequest<{ template_analytics?: { data?: unknown[] } }>({
    path: wabaId,
    accessToken,
    query: { fields: field },
  });

  const data: TemplateAnalyticsDataPoint[] = sumRecords(response.template_analytics?.data ?? []).map(
    (point) => ({
      start: numFrom(point, ['start']),
      end: numFrom(point, ['end']),
      template_name: strFrom(point, ['template_name', 'name', 'template']),
      template_language: strFrom(point, ['template_language', 'language']),
      sent: numFrom(point, ['sent', 'SENT']),
      delivered: numFrom(point, ['delivered', 'DELIVERED']),
      read: numFrom(point, ['read', 'READ', 'read_count']),
    })
  );

  // Roll up per template (name + language).
  const byTemplate = new Map<string, TemplateStat>();
  for (const point of data) {
    const name = point.template_name ?? '(unknown)';
    const language = point.template_language;
    const key = `${name}:${language ?? ''}`;
    const existing = byTemplate.get(key) ?? {
      template_name: name,
      template_language: language,
      sent: 0,
      delivered: 0,
      read: 0,
    };
    existing.sent += point.sent;
    existing.delivered += point.delivered;
    existing.read += point.read;
    byTemplate.set(key, existing);
  }

  return {
    templates: Array.from(byTemplate.values()).sort((a, b) => b.sent - a.sent),
    data,
  };
}

/**
 * Fetch a phone number's health: quality rating (GREEN/YELLOW/RED/NA),
 * messaging limit tier (250/1K/10K/100K/UNLIMITED unique users per 24h),
 * verified name, name status and code verification status. Use for the
 * account-health dashboard alongside `phone_number_quality_update` webhooks.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers
 */
export async function fetchPhoneNumberHealth(
  options: PhoneNumberCredential
): Promise<PhoneNumberHealth> {
  const { phoneNumberId, accessToken } = options;
  const data = await graphRequest<{
    id?: string;
    verified_name?: string;
    quality_rating?: string;
    messaging_limit_tier?: string;
    name_status?: string;
    code_verification_status?: string;
  }>({
    path: phoneNumberId,
    accessToken,
    query: {
      fields:
        'verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status',
    },
  });

  return {
    id: data.id ?? phoneNumberId,
    verified_name: data.verified_name ?? null,
    quality_rating: data.quality_rating ?? null,
    messaging_limit_tier: data.messaging_limit_tier ?? null,
    name_status: data.name_status ?? null,
    code_verification_status: data.code_verification_status ?? null,
  };
}
