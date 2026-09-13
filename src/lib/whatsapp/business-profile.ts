// ============================================
// AssistMint — WhatsApp business profile
// ============================================
// Read/update the profile customers see when they tap the business name:
// about, address, description, email, websites and vertical. Use during
// onboarding to auto-fill each restaurant's profile from AssistMint data.

import { graphRequest } from './shared';
import type { GraphSuccess, PhoneNumberCredential } from './types';

/** Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles */
const PROFILE_FIELDS = 'about,address,description,email,profile_picture_url,websites,vertical';

/** A WhatsApp business profile as returned by the API. */
export interface WhatsAppBusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  messaging_product?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
}

/**
 * Get the business profile for a phone number.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles
 */
export async function getBusinessProfile(
  options: PhoneNumberCredential
): Promise<WhatsAppBusinessProfile> {
  const { phoneNumberId, accessToken } = options;
  const data = await graphRequest<{ data?: WhatsAppBusinessProfile[] } & WhatsAppBusinessProfile>({
    path: `${phoneNumberId}/whatsapp_business_profile`,
    accessToken,
    query: { fields: PROFILE_FIELDS },
  });
  // The API returns { data: [profile] }; fall back to a flat object defensively.
  if (Array.isArray(data.data) && data.data.length > 0) {
    return data.data[0];
  }
  const { data: _ignored, ...flat } = data;
  return flat;
}

/** Fields that can be updated on a business profile. */
export interface UpdateBusinessProfileInput {
  /** Max 139 characters. */
  about?: string;
  /** Max 256 characters. */
  address?: string;
  /** Max 512 characters. */
  description?: string;
  /** Max 128 characters, valid email format. */
  email?: string;
  /** Up to 2 websites (must include http:// or https://). */
  websites?: string[];
  /** Business vertical, e.g. RESTAURANT, BEAUTY, HEALTH, EDU, RETAIL. */
  vertical?: string;
  /**
   * Media handle of the profile picture (from uploading an image via the
   * Resumable Upload API). This is the only documented way to set the
   * picture via API — reads return `profile_picture_url`, updates take a
   * handle.
   */
  profilePictureHandle?: string;
  /**
   * Not settable via the API (accepted for source compatibility and ignored
   * with a warning) — Meta only accepts `profile_picture_handle`.
   */
  profilePictureUrl?: string;
  /** snake_case alias for profilePictureUrl. */
  profile_picture_url?: string;
}

/**
 * Update the business profile (about, address, description, email, websites,
 * vertical, profile picture). Only provided fields are changed. Websites are
 * capped at 2 per Meta limits.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles
 */
export async function updateBusinessProfile(
  options: PhoneNumberCredential & UpdateBusinessProfileInput
): Promise<GraphSuccess> {
  const {
    phoneNumberId,
    accessToken,
    about,
    address,
    description,
    email,
    websites,
    vertical,
    profilePictureHandle,
    profilePictureUrl,
    profile_picture_url,
  } = options;

  if (websites && websites.length > 2) {
    throw new Error(`updateBusinessProfile: WhatsApp allows at most 2 websites, got ${websites.length}`);
  }

  const pictureUrl = profilePictureUrl ?? profile_picture_url;
  if (pictureUrl && !profilePictureHandle) {
    // Meta only accepts a media handle on update; warn rather than fail so
    // the rest of the profile still updates.
    console.warn(
      '[WhatsApp] updateBusinessProfile: profilePictureUrl cannot be set via the API — only profilePictureHandle (a Resumable Upload media handle) is supported; the picture field was skipped.'
    );
  }

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
  };
  if (about !== undefined) body.about = about.substring(0, 139);
  if (address !== undefined) body.address = address.substring(0, 256);
  if (description !== undefined) body.description = description.substring(0, 512);
  if (email !== undefined) body.email = email.substring(0, 128);
  if (websites !== undefined) body.websites = websites;
  if (vertical !== undefined) body.vertical = vertical;
  if (profilePictureHandle !== undefined) body.profile_picture_handle = profilePictureHandle;

  return graphRequest<GraphSuccess>({
    path: `${phoneNumberId}/whatsapp_business_profile`,
    accessToken,
    method: 'POST',
    body,
  });
}
