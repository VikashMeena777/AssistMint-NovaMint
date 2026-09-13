// ============================================
// AssistMint — WhatsApp Display Name Management
// Keeps the Meta display name in sync with the
// restaurant name, tracks approval state, and
// surfaces the REAL send blockers via the
// Health Status API.
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names
// ============================================

import { graphUrl } from "./client";
import { WhatsAppApiError } from "./types";

export interface DisplayNameStatus {
  verified_name?: string;
  name_status?: string;
  new_display_name?: string;
  new_name_status?: string;
}

export interface HealthEntity {
  entity_type: string;
  id: string;
  can_send_message: string;
  can_receive_call_sip?: string;
  errors?: Array<{
    error_code: number;
    error_description: string;
    possible_solution?: string;
  }>;
  additional_info?: string[];
}

export interface MessagingHealth {
  can_send_message: string;
  entities: HealthEntity[];
}

async function graphFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(graphUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json();
  if (!response.ok || (data as { error?: unknown })?.error) {
    throw new WhatsAppApiError(response.status, data);
  }
  return data as T;
}

/**
 * Request a display name change. The new name undergoes Meta's verification;
 * once approved, the phone_number_name_update webhook fires and the number
 * MUST be re-registered to apply it (handled by the webhook).
 * Limits: 10 changes per 30-day period; 14 days to re-register after approval.
 */
export async function requestDisplayNameChange(options: {
  phoneNumberId: string;
  accessToken: string;
  newName: string;
}): Promise<{ success: boolean }> {
  const { phoneNumberId, accessToken, newName } = options;
  const response = await fetch(graphUrl(phoneNumberId), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: new URLSearchParams({ new_display_name: newName }).toString(),
  });
  const data = await response.json();
  if (!response.ok || (data as { error?: unknown })?.error) {
    throw new WhatsAppApiError(response.status, data);
  }
  return { success: true };
}

/**
 * Get the display name state — current name/status plus any pending change.
 */
export async function getDisplayNameStatus(options: {
  phoneNumberId: string;
  accessToken: string;
}): Promise<DisplayNameStatus> {
  return graphFetch<DisplayNameStatus>(
    `${options.phoneNumberId}?fields=verified_name,name_status,new_display_name,new_name_status`,
    options.accessToken
  );
}

/**
 * Get the REAL messaging health — can_send_message at every level (phone,
 * WABA, business, app) with the exact blockers and Meta's suggested fixes.
 * This is what to check when sends fail mysteriously (e.g. 131037 can mask
 * a WABA payment-method block).
 */
export async function getMessagingHealth(options: {
  phoneNumberId: string;
  accessToken: string;
}): Promise<MessagingHealth> {
  const result = await graphFetch<{ health_status: MessagingHealth }>(
    `${options.phoneNumberId}?fields=health_status`,
    options.accessToken
  );
  return result.health_status;
}

/**
 * Re-register the number to apply an APPROVED display name change.
 * Only call after approval (phone_number_name_update webhook with
 * decision === APPROVED) — re-registering before approval has no effect.
 */
export async function reRegisterPhoneNumber(options: {
  phoneNumberId: string;
  accessToken: string;
  pin?: string;
}): Promise<{ success: boolean }> {
  const { phoneNumberId, accessToken, pin = "000000" } = options;
  return graphFetch<{ success: boolean }>(`${phoneNumberId}/register`, accessToken, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
}
