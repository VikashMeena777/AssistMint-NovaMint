// ============================================
// AssistMint — Official Business Account (green/blue tick)
// ============================================
// OBA status query, API submission and a client-side eligibility checklist.
// Acceptance requires notability ("substantial presence in news articles")
// — do NOT promise this to typical local merchants; frame portfolio
// business verification instead. Denied requests can't be appealed; reapply
// after 30 days.

import { graphRequest } from './shared';
import type { GraphSuccess, PhoneNumberCredential } from './types';

/** Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Minimum days on the WhatsApp platform before applying. */
export const OBA_MIN_DAYS_ON_PLATFORM = 30;

// ─── Status ──────────────

/**
 * Get the current OBA (official business account) status of a phone number
 * via `GET /{phoneNumberId}?fields=official_business_account`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts
 */
export async function getObaStatus(
  options: PhoneNumberCredential
): Promise<{ obaStatus: string | null }> {
  const { phoneNumberId, accessToken } = options;
  const data = await graphRequest<{
    official_business_account?: { oba_status?: string } | string;
  }>({
    path: phoneNumberId,
    accessToken,
    query: { fields: 'official_business_account' },
  });

  const raw = data.official_business_account;
  if (typeof raw === 'string') return { obaStatus: raw };
  return { obaStatus: raw?.oba_status ?? null };
}

// ─── Submission ──────────────

export interface RequestObaOptions extends PhoneNumberCredential {
  /** Business website demonstrating notability. */
  website: string;
  /** ISO country code, e.g. 'IN'. */
  country: string;
  /** Language code, e.g. 'en' or 'hi'. */
  language: string;
  /** 1-5 press links from publications with sizable audiences (paid listings don't count). */
  pressUrls: string[];
  /** Optional parent brand, if the number belongs to a larger brand. */
  parentBrand?: string;
}

/**
 * Submit an OBA (green/blue tick) request via
 * `POST /{phoneNumberId}/official_business_account`. Requires business
 * verification, two-step verification and an approved display name. Denied
 * requests cannot be appealed — reapply after 30 days.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts
 */
export async function requestOba(options: RequestObaOptions): Promise<GraphSuccess> {
  const { phoneNumberId, accessToken, website, country, language, pressUrls, parentBrand } = options;

  if (pressUrls.length < 1 || pressUrls.length > 5) {
    throw new Error(`requestOba: expected 1-5 press URLs, got ${pressUrls.length}`);
  }

  return graphRequest<GraphSuccess>({
    path: `${phoneNumberId}/official_business_account`,
    accessToken,
    method: 'POST',
    body: {
      website,
      country,
      language,
      press_urls: pressUrls,
      ...(parentBrand !== undefined ? { parent_brand: parentBrand } : {}),
    },
  });
}

// ─── Eligibility checklist (client-side heuristic) ──────────────

/** One requirement in the OBA eligibility checklist. */
export interface ObaChecklistItem {
  id: 'days_on_platform' | 'quality_rating' | 'name_status' | 'business_verified' | 'two_step_verification' | 'notability';
  label: string;
  /** pass | fail | unknown (not checkable via this API) | manual (human review). */
  status: 'pass' | 'fail' | 'unknown' | 'manual';
  detail: string;
}

/** Structured OBA eligibility heuristic. */
export interface ObaEligibilityChecklist {
  daysOnPlatform: number | null;
  qualityRating: string | null;
  nameStatus: string | null;
  verifiedBusiness: boolean | null;
  /** True when every automatically checkable requirement passes. */
  meetsMinimumRequirements: boolean;
  checklist: ObaChecklistItem[];
}

/**
 * Run a client-side OBA eligibility check. Fetches the phone number's
 * quality rating and display-name status; optionally computes days on
 * platform from `registeredAt` (when AssistMint onboarded the number) and
 * checks portfolio business verification when `businessId` is provided.
 *
 * This is a heuristic — the real decision needs Meta's notability review.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts
 */
export async function obaEligibilityCheck(
  options: PhoneNumberCredential & {
    /** When the number was registered on the platform (AssistMint onboarding date). */
    registeredAt?: string | Date;
    /** Business portfolio id — enables the verified-business check. */
    businessId?: string;
  }
): Promise<ObaEligibilityChecklist> {
  const { phoneNumberId, accessToken, registeredAt, businessId } = options;

  const phoneData = await graphRequest<{
    quality_rating?: string;
    name_status?: string;
  }>({
    path: phoneNumberId,
    accessToken,
    query: { fields: 'quality_rating,name_status' },
  });

  const qualityRating = phoneData.quality_rating ?? null;
  const nameStatus = phoneData.name_status ?? null;

  let daysOnPlatform: number | null = null;
  if (registeredAt !== undefined) {
    const registered = registeredAt instanceof Date ? registeredAt.getTime() : Date.parse(registeredAt);
    if (!Number.isNaN(registered)) {
      daysOnPlatform = Math.floor((Date.now() - registered) / DAY_MS);
    }
  }

  let verifiedBusiness: boolean | null = null;
  if (businessId !== undefined) {
    try {
      const businessData = await graphRequest<{ verified?: boolean }>({
        path: businessId,
        accessToken,
        query: { fields: 'verified' },
      });
      verifiedBusiness = businessData.verified ?? false;
    } catch {
      verifiedBusiness = null;
    }
  }

  const checklist: ObaChecklistItem[] = [
    {
      id: 'days_on_platform',
      label: `At least ${OBA_MIN_DAYS_ON_PLATFORM} days on the WhatsApp platform`,
      status:
        daysOnPlatform === null
          ? 'unknown'
          : daysOnPlatform >= OBA_MIN_DAYS_ON_PLATFORM
            ? 'pass'
            : 'fail',
      detail:
        daysOnPlatform === null
          ? 'Pass registeredAt to evaluate this requirement.'
          : `${daysOnPlatform} day(s) on platform.`,
    },
    {
      id: 'quality_rating',
      label: 'Healthy quality rating',
      status: qualityRating === 'GREEN' ? 'pass' : qualityRating === 'RED' ? 'fail' : 'unknown',
      detail: qualityRating === null ? 'Quality rating unavailable.' : `Quality rating: ${qualityRating}.`,
    },
    {
      id: 'name_status',
      label: 'Approved display name',
      status: nameStatus === 'APPROVED' ? 'pass' : nameStatus === 'DECLINED' ? 'fail' : 'unknown',
      detail: nameStatus === null ? 'Name status unavailable.' : `Name status: ${nameStatus}.`,
    },
    {
      id: 'business_verified',
      label: 'Verified business portfolio',
      status: verifiedBusiness === null ? 'unknown' : verifiedBusiness ? 'pass' : 'fail',
      detail:
        verifiedBusiness === null
          ? 'Pass businessId to evaluate this requirement.'
          : verifiedBusiness
            ? 'Portfolio is verified.'
            : 'Portfolio is not verified — complete Business Verification first.',
    },
    {
      id: 'two_step_verification',
      label: 'Two-step verification enabled on the number',
      status: 'unknown',
      detail: 'Not checkable via this API — verify in WhatsApp Manager / phone number settings.',
    },
    {
      id: 'notability',
      label: 'Notability (substantial press presence)',
      status: 'manual',
      detail:
        'Requires notable press coverage. Paid/promotional listings do not count. Manual review before submitting.',
    },
  ];

  const meetsMinimumRequirements = checklist
    .filter((item) => item.status === 'pass' || item.status === 'fail' || item.status === 'unknown')
    .every((item) => {
      if (item.id === 'two_step_verification' || item.id === 'notability') return true; // not automated
      return item.status === 'pass';
    });

  return {
    daysOnPlatform,
    qualityRating,
    nameStatus,
    verifiedBusiness,
    meetsMinimumRequirements,
    checklist,
  };
}
