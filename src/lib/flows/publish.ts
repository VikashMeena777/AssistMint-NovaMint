// ============================================
// AssistMint — WhatsApp Flows Publish API
// Server-action-facing helpers to create, update
// and publish Flows via the Graph API, plus the
// business public key registration required
// before any endpoint-powered Flow can be sent.
//
// Documented paths (Flows API guide):
//   POST /{WABA_ID}/flows                — create (accepts flow_json + publish in one call)
//   POST /{FLOW_ID}                      — update metadata (name/categories/endpoint_uri/application_id)
//   POST /{FLOW_ID}/assets               — upload/replace the Flow JSON (multipart, asset_type=FLOW_JSON)
//   POST /{FLOW_ID}/start_publishing     — publish a draft
//   GET  /{WABA_ID}/flows                — list
//   GET  /{FLOW_ID}?fields=...           — details/status
//   POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption — register the RSA public key
//
// Coordination: reuses createFlow from the WhatsApp API client
// (src/lib/whatsapp/flows.ts) for the metadata-only create. The single-call
// create+publish, Flow JSON asset upload, listing, status polling, public
// key registration and the documented /start_publishing publish call are
// implemented here with plain fetch because the API client does not cover
// them (its publishFlow targets /{flowId}/publish; the documented publish
// path is /{flowId}/start_publishing, used below).
// ============================================

import { createFlow as createFlowViaApiClient } from '@/lib/whatsapp/flows';
import type { FlowJson, FlowKind } from './definitions';

/** Graph API version used by the rest of the codebase (src/lib/whatsapp/client.ts). */
const GRAPH_API_BASE = 'https://graph.facebook.com/v25.0';

// ─── Types ──────────────────────────────────

export type FlowCategory =
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'APPOINTMENT_BOOKING'
  | 'LEAD_GENERATION'
  | 'CONTACT_US'
  | 'CUSTOMER_SUPPORT'
  | 'SURVEY'
  | 'OTHER';

export interface FlowSummary {
  id: string;
  name: string;
  status?: string;
}

export interface FlowValidationIssue {
  error?: string;
  error_type?: string;
  message?: string;
}

export interface EnsureFlowResult {
  flowId: string;
  status: string;
  created: boolean;
  /** Populated when Meta rejected the Flow JSON — all errors must be fixed before publishing. */
  validationErrors: FlowValidationIssue[];
}

export class GraphApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'GraphApiError';
    this.status = status;
    this.payload = payload;
  }
}

// ─── Graph plumbing ─────────────────────────

function extractGraphErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null) {
    const error = (payload as Record<string, unknown>).error;
    if (typeof error === 'object' && error !== null) {
      const record = error as Record<string, unknown>;
      const message = record.message;
      const code = record.code;
      if (typeof message === 'string') {
        return typeof code === 'number' ? `${message} (code ${code})` : message;
      }
    }
    if (typeof (payload as Record<string, unknown>).message === 'string') {
      return (payload as Record<string, unknown>).message as string;
    }
  }
  return 'Unknown Graph API error';
}

/** Request options for {@link graphFetch} — same as RequestInit but with plain-object headers (merged with the auth header). */
type GraphFetchInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

async function graphFetch(
  path: string,
  accessToken: string,
  init?: GraphFetchInit
): Promise<unknown> {
  const response = await fetch(`${GRAPH_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new GraphApiError(
      response.status,
      `Graph API ${response.status} on ${path}: ${extractGraphErrorMessage(payload)}`,
      payload
    );
  }
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asValidationErrors(value: unknown): FlowValidationIssue[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      error: typeof record.error === 'string' ? record.error : undefined,
      error_type: typeof record.error_type === 'string' ? record.error_type : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
    };
  });
}

/** Serialize a Flow JSON object to the string form the API expects. */
export function flowJsonToString(flowJson: FlowJson | string): string {
  return typeof flowJson === 'string' ? flowJson : JSON.stringify(flowJson);
}

// ─── Business public key (Flows encryption) ─

/**
 * Register the RSA public key for a phone number (required before any
 * endpoint-powered Flow can be sent — Meta's client fetches this key to
 * encrypt the AES key it sends us).
 *
 * POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/whatsapp-business-encryption
 */
export async function setBusinessPublicKey(
  phoneNumberId: string,
  accessToken: string,
  publicKeyPem: string
): Promise<void> {
  const body = new URLSearchParams({ business_public_key: publicKeyPem.trim() });
  await graphFetch(`/${phoneNumberId}/whatsapp_business_encryption`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

/** Read back the registered public key + its signature status (VALID | MISMATCH). */
export async function getBusinessPublicKey(
  phoneNumberId: string,
  accessToken: string
): Promise<{ publicKey?: string; signatureStatus?: string }> {
  const payload = asRecord(
    await graphFetch(`/${phoneNumberId}/whatsapp_business_encryption`, accessToken, { method: 'GET' })
  );
  return {
    publicKey: typeof payload.business_public_key === 'string' ? payload.business_public_key : undefined,
    signatureStatus:
      typeof payload.business_public_key_signature_status === 'string'
        ? payload.business_public_key_signature_status
        : undefined,
  };
}

// ─── Flow CRUD ──────────────────────────────

/** List flows on a WABA (used to find an existing flow by name). */
export async function listFlows(wabaId: string, accessToken: string): Promise<FlowSummary[]> {
  const payload = asRecord(
    await graphFetch(`/${wabaId}/flows?limit=100`, accessToken, { method: 'GET' })
  );
  const data = Array.isArray(payload.data) ? payload.data : [];
  return data.map((item) => {
    const record = asRecord(item);
    return {
      id: typeof record.id === 'string' ? record.id : '',
      name: typeof record.name === 'string' ? record.name : '',
      status: typeof record.status === 'string' ? record.status : undefined,
    };
  }).filter((flow) => flow.id.length > 0);
}

/** Fetch a flow's current status (DRAFT | PUBLISHING | PUBLISHED | BLOCKED | THROTTLED | DEPRECATED). */
export async function getFlowStatus(flowId: string, accessToken: string): Promise<string | null> {
  const payload = asRecord(
    await graphFetch(`/${flowId}?fields=id,name,status`, accessToken, { method: 'GET' })
  );
  return typeof payload.status === 'string' ? payload.status : null;
}

/**
 * Create a Flow with optional Flow JSON attached and publish in the same
 * call (current Flows API: `flow_json` + `publish` parameters on create).
 * Returns validation errors when Meta rejects the Flow JSON.
 */
export async function createFlow(options: {
  wabaId: string;
  accessToken: string;
  name: string;
  categories: FlowCategory[];
  endpointUri: string;
  flowJson?: FlowJson | string;
  publish?: boolean;
  applicationId?: string;
}): Promise<{ flowId: string | null; validationErrors: FlowValidationIssue[] }> {
  const body: Record<string, unknown> = {
    name: options.name,
    categories: options.categories,
    endpoint_uri: options.endpointUri,
  };
  if (options.flowJson !== undefined) body.flow_json = flowJsonToString(options.flowJson);
  if (options.publish) body.publish = true;
  if (options.applicationId) body.application_id = options.applicationId;

  const payload = asRecord(
    await graphFetch(`/${options.wabaId}/flows`, options.accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

  return {
    flowId: typeof payload.id === 'string' ? payload.id : null,
    validationErrors: asValidationErrors(payload.validation_errors),
  };
}

/** Update a Flow's metadata (name, categories, endpoint URI, connected Meta app). */
export async function updateFlowMetadata(
  flowId: string,
  accessToken: string,
  updates: {
    name?: string;
    categories?: FlowCategory[];
    endpointUri?: string;
    applicationId?: string;
  }
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (updates.name) body.name = updates.name;
  if (updates.categories) body.categories = updates.categories;
  if (updates.endpointUri) body.endpoint_uri = updates.endpointUri;
  if (updates.applicationId) body.application_id = updates.applicationId;
  if (Object.keys(body).length === 0) return;

  await graphFetch(`/${flowId}`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Upload (or replace) a Flow's Flow JSON.
 * POST /{FLOW_ID}/assets — multipart form: file (flow.json), name="flow.json", asset_type="FLOW_JSON".
 */
export async function uploadFlowJson(
  flowId: string,
  accessToken: string,
  flowJson: FlowJson | string
): Promise<void> {
  const form = new FormData();
  form.append('file', new Blob([flowJsonToString(flowJson)], { type: 'application/json' }), 'flow.json');
  form.append('name', 'flow.json');
  form.append('asset_type', 'FLOW_JSON');

  await graphFetch(`/${flowId}/assets`, accessToken, { method: 'POST', body: form });
}

/** Publish a draft Flow (async on Meta's side — poll with waitForFlowStatus). */
export async function startPublishing(flowId: string, accessToken: string): Promise<void> {
  await graphFetch(`/${flowId}/start_publishing`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

/** Poll a flow until it reaches the target status (or attempts run out). */
export async function waitForFlowStatus(
  flowId: string,
  accessToken: string,
  targetStatus = 'PUBLISHED',
  attempts = 5,
  delayMs = 2000
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const status = await getFlowStatus(flowId, accessToken);
    if (status === targetStatus) return status;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return getFlowStatus(flowId, accessToken);
}

// ─── ensureFlow: the one-call orchestrator ──

/** Sensible default categories per vertical flow. */
export function defaultCategoriesForFlow(kind: FlowKind | 'other'): FlowCategory[] {
  switch (kind) {
    case 'appointment':
      return ['APPOINTMENT_BOOKING'];
    case 'feedback':
      return ['SURVEY'];
    case 'address':
      return ['OTHER'];
    default:
      return ['OTHER'];
  }
}

/**
 * Ensure a published Flow exists for a WABA:
 *   1. Look for an existing flow by name.
 *      - PUBLISHED → reuse it as-is.
 *      - DRAFT → upload the given Flow JSON and publish it.
 *      - Any other status (BLOCKED / THROTTLED / DEPRECATED / FAILED) → throws;
 *        pick a new flow name or fix the endpoint health first.
 *   2. Otherwise create it — single call with flow_json + publish when the
 *      API accepts it, falling back to create → upload asset → start_publishing.
 *
 * Prerequisites enforced by Meta at publish time (see README for the checklist):
 *   - endpoint_uri live and answering the GET health check with status "ready"
 *   - RSA public key registered for the phone number (setBusinessPublicKey)
 *   - a Meta application connected to the flow (applicationId)
 *   - WABA subscribed to Flows webhooks
 */
export async function ensureFlow(options: {
  wabaId: string;
  accessToken: string;
  /** Flow name — unique per WABA; reuse the same name to idempotently re-run. */
  name: string;
  endpointUri: string;
  categories?: FlowCategory[];
  flowJson: FlowJson | string;
  /** Meta app id to connect (required for endpoint flows). */
  applicationId?: string;
  /** Wait (poll) for PUBLISHED before returning. Default true. */
  waitForPublish?: boolean;
}): Promise<EnsureFlowResult> {
  const categories = options.categories ?? defaultCategoriesForFlow('other');
  const accessToken = options.accessToken;

  // 1. Existing flow by name?
  const existing = (await listFlows(options.wabaId, accessToken)).find((f) => f.name === options.name);

  if (existing) {
    if (existing.status === 'PUBLISHED') {
      return { flowId: existing.id, status: 'PUBLISHED', created: false, validationErrors: [] };
    }
    if (existing.status === 'DRAFT') {
      await uploadFlowJson(existing.id, accessToken, options.flowJson);
      if (options.applicationId) {
        await updateFlowMetadata(existing.id, accessToken, {
          endpointUri: options.endpointUri,
          applicationId: options.applicationId,
        });
      }
      await startPublishing(existing.id, accessToken);
      const status = options.waitForPublish === false
        ? await getFlowStatus(existing.id, accessToken)
        : await waitForFlowStatus(existing.id, accessToken);
      return {
        flowId: existing.id,
        status: status ?? 'PUBLISHING',
        created: false,
        validationErrors: [],
      };
    }
    throw new Error(
      `Flow "${options.name}" exists with status ${existing.status ?? 'UNKNOWN'} — ` +
        'fix the endpoint health (BLOCKED/THROTTLED) or use a new flow name (DEPRECATED flows cannot be restored).'
    );
  }

  // 2. Create — try the single-call create+publish first.
  let flowId: string | null = null;
  let validationErrors: FlowValidationIssue[] = [];
  try {
    const created = await createFlow({
      wabaId: options.wabaId,
      accessToken,
      name: options.name,
      categories,
      endpointUri: options.endpointUri,
      flowJson: options.flowJson,
      publish: true,
      applicationId: options.applicationId,
    });
    flowId = created.flowId;
    validationErrors = created.validationErrors;
  } catch (error) {
    console.warn(
      '[FlowsPublish] Single-call create+publish failed, falling back to create → upload → publish:',
      (error as Error).message
    );
  }

  // 3. Fallback: create via the WhatsApp API client (metadata only, no
  //    flow_json support there) → upload JSON → connect app → publish.
  if (!flowId) {
    const created = await createFlowViaApiClient({
      wabaId: options.wabaId,
      accessToken,
      name: options.name,
      categories,
      endpointUri: options.endpointUri,
    });
    flowId = created.id;
    await uploadFlowJson(flowId, accessToken, options.flowJson);
    if (options.applicationId) {
      await updateFlowMetadata(flowId, accessToken, { applicationId: options.applicationId });
    }
    await startPublishing(flowId, accessToken);
  }

  if (validationErrors.length > 0) {
    // Flow JSON was rejected — the flow stays a draft; surface the issues.
    return { flowId, status: (await getFlowStatus(flowId, accessToken)) ?? 'DRAFT', created: true, validationErrors };
  }

  const status = options.waitForPublish === false
    ? await getFlowStatus(flowId, accessToken)
    : await waitForFlowStatus(flowId, accessToken);
  return { flowId, status: status ?? 'PUBLISHING', created: true, validationErrors: [] };
}
