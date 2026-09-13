// ============================================
// AssistMint — WhatsApp Flows
// ============================================
// Flow SENDING (interactive.type "flow") plus the Flow Management API
// (create / publish / deprecate / update metadata / health). The encrypted
// Flow endpoint server (RSA + AES data exchange) is a separate service —
// this module only covers the API client side.

import { sanitizeWhatsAppNumber } from './client';
import { extractMessageId, graphRequest } from './shared';
import type { GraphSuccess, MessageSendEnvelope, MessageTarget, WabaCredential } from './types';

// ─── Sending a Flow ──────────────

export interface SendFlowMessageOptions extends MessageTarget {
  /** Flow id (from createFlow / WhatsApp Manager). Provide this or `flowName`. */
  flowId?: string;
  /** Alternative to flowId — resolves to the latest published flow with that name. */
  flowName?: string;
  /** Call-to-action button label (≤ 30 chars, no emoji), e.g. "Book appointment". */
  flowCta: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  /** Send the draft version instead of the last published one. Default: 'published'. */
  mode?: 'published' | 'draft';
  /** Your id for this interaction — returned in flow_response webhooks for correlation. */
  flowToken?: string;
  /** 'navigate' (open a specific screen, default) or 'data_exchange' (call your endpoint first). */
  flowAction?: 'navigate' | 'data_exchange';
  /** First screen to open (for navigate). */
  screen?: string;
  /** Data payload for the first screen (maps to flow_action_payload.data). */
  screenData?: Record<string, unknown>;
}

/**
 * Send a WhatsApp Flow message — a native in-chat multi-screen form (date
 * pickers, dropdowns, inputs) for bookings, feedback and lead capture.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow
 */
export async function sendFlowMessage(options: SendFlowMessageOptions): Promise<{ message_id: string }> {
  const {
    phoneNumberId,
    accessToken,
    to,
    flowId,
    flowName,
    flowCta,
    bodyText,
    headerText,
    footerText,
    mode = 'published',
    flowToken,
    flowAction = 'navigate',
    screen,
    screenData,
  } = options;

  if ((flowId ? 1 : 0) + (flowName ? 1 : 0) !== 1) {
    throw new Error('sendFlowMessage: provide exactly one of flowId or flowName');
  }

  const parameters: Record<string, unknown> = {
    flow_message_version: '3',
    ...(flowToken !== undefined ? { flow_token: flowToken } : {}),
    ...(flowId !== undefined ? { flow_id: flowId } : { flow_name: flowName }),
    flow_cta: flowCta.substring(0, 30),
    mode,
    flow_action: flowAction,
    ...(screen !== undefined || screenData !== undefined
      ? {
          flow_action_payload: {
            ...(screen !== undefined ? { screen } : {}),
            ...(screenData !== undefined ? { data: screenData } : {}),
          },
        }
      : {}),
  };

  const interactive: Record<string, unknown> = {
    type: 'flow',
    ...(headerText ? { header: { type: 'text', text: headerText.substring(0, 60) } } : {}),
    body: { text: bodyText.substring(0, 1024) },
    ...(footerText ? { footer: { text: footerText.substring(0, 60) } } : {}),
    action: { name: 'flow', parameters },
  };

  const data = await graphRequest<MessageSendEnvelope>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizeWhatsAppNumber(to),
      type: 'interactive',
      interactive,
    },
  });
  return { message_id: extractMessageId(data) };
}

// ─── Flow Management API ──────────────

export interface CreateFlowOptions extends WabaCredential {
  name: string;
  /** e.g. ['APPOINTMENT_BOOKING'], ['LEAD_GENERATION'], ['CUSTOMER_SUPPORT'], ['SURVEY']. */
  categories: string[];
  /** Public HTTPS endpoint implementing the encrypted Flow endpoint protocol. */
  endpointUri: string;
}

/**
 * Create a Flow via `POST /{wabaId}/flows`. The Flow starts in DRAFT — build
 * its screens (Flow JSON) separately, then `publishFlow`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
 */
export async function createFlow(options: CreateFlowOptions): Promise<{ id: string }> {
  const { wabaId, accessToken, name, categories, endpointUri } = options;
  const data = await graphRequest<{ id?: string }>({
    path: `${wabaId}/flows`,
    accessToken,
    method: 'POST',
    body: {
      name,
      categories,
      endpoint_uri: endpointUri,
    },
  });
  if (!data.id) {
    throw new Error('createFlow: Flow id missing in Graph API response');
  }
  return { id: data.id };
}

/**
 * Publish a Flow (DRAFT → PUBLISHED) so `mode: "published"` messages render
 * it. Only healthy, endpoint-verified flows can be published.
 *
 * Documented path (verified live 2026-09-13): POST /{flow_id}/publish — the
 * older /start_publishing edge is gone (code 2500 "Unknown path components").
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
 */
export async function publishFlow(options: { flowId: string; accessToken: string }): Promise<GraphSuccess> {
  const { flowId, accessToken } = options;
  return graphRequest<GraphSuccess>({
    path: `${flowId}/publish`,
    accessToken,
    method: "POST",
  });
}

/**
 * Deprecate a published Flow. Users who open it afterwards see an error —
 * migrate them to a new flow first.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
 */
export async function deprecateFlow(options: { flowId: string; accessToken: string }): Promise<GraphSuccess> {
  const { flowId, accessToken } = options;
  return graphRequest<GraphSuccess>({
    path: `${flowId}/deprecate`,
    accessToken,
    method: 'POST',
  });
}

/**
 * Update a Flow's metadata (name, encrypted-data endpoint URI, categories).
 * Flow screens themselves are updated through the Flow JSON, not here.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
 */
export async function updateFlowMetadata(
  options: {
    flowId: string;
    accessToken: string;
    name?: string;
    endpointUri?: string;
    categories?: string[];
  }
): Promise<GraphSuccess> {
  const { flowId, accessToken, name, endpointUri, categories } = options;
  const body: Record<string, unknown> = {};
  if (name !== undefined) body.name = name;
  if (endpointUri !== undefined) body.endpoint_uri = endpointUri;
  if (categories !== undefined) body.categories = categories;
  return graphRequest<GraphSuccess>({
    path: flowId,
    accessToken,
    method: 'POST',
    body,
  });
}

/** Health status of a Flow endpoint. */
export interface FlowHealth {
  healthStatus: string | null;
  healthStatusDescription: string | null;
}

/**
 * Get a Flow's health status. Flows whose endpoints are unreliable or slow
 * get THROTTLED (10 messages/hour) or BLOCKED — monitor this and alert.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
 */
export async function getFlowHealth(options: { flowId: string; accessToken: string }): Promise<FlowHealth> {
  const { flowId, accessToken } = options;
  const data = await graphRequest<{
    health_status?: string;
    health_status_description?: string;
  }>({
    path: flowId,
    accessToken,
    query: { fields: 'health_status,health_status_description' },
  });
  return {
    healthStatus: data.health_status ?? null,
    healthStatusDescription: data.health_status_description ?? null,
  };
}
