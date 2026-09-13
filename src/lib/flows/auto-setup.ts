// ============================================
// AssistMint — WhatsApp Flows Auto-Setup
// Zero-manual provisioning of everything a
// restaurant needs to use endpoint-powered
// WhatsApp Flows. Called automatically right
// after WhatsApp connect (fire-and-forget) and
// from the Settings → WhatsApp Health "Provision
// now" button. The owner never touches keys,
// Meta dashboards or env vars.
//
// Steps (each individually guarded — a failure in
// one logs and continues, the function NEVER
// throws):
//   a. getOrCreateFlowKeys — app-wide RSA keypair
//      (app_config, self-provisioned; env override wins)
//   b. setBusinessPublicKey — register the public key
//      on the connected phone number
//   c. ensureFlow — create/reuse the "AssistMint Booking"
//      appointment flow (Flow JSON v5 built from the
//      restaurant's menu items; generic fallback when
//      the menu is empty) with our endpoint_uri
//   d. startPublishing — publish when still a draft
//      (ensureFlow already publishes on the create path)
//   e. persist flow_appointment_id + flows_provisioned_at
//      into restaurants.business_config (read-then-write
//      merge — other keys are never clobbered)
//   f. log activity 'whatsapp.flows_provisioned'
// ============================================

import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/utils/activity-logger';
import { getOrCreateFlowKeys } from './keys';
import {
  ensureFlow,
  getFlowStatus,
  listFlows,
  startPublishing,
  setBusinessPublicKey,
} from './publish';
import { buildAppointmentFlow, type FlowServiceOption } from './definitions';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

/** Flow name on the WABA — reusing it makes ensureFlowProvisioned idempotent. */
export const APPOINTMENT_FLOW_NAME = 'AssistMint Booking';

/** Public endpoint Meta calls for every data exchange (same APP_URL pattern as the connect route). */
function flowsEndpointUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamintnetworks.in';
  return `${appUrl}/api/whatsapp/flows-endpoint`;
}

// ─── Types ──────────────────────────────────

/** Per-step status report — returned, never thrown. */
export interface FlowsProvisionReport {
  restaurantId: string;
  /** (a) App-wide keypair available (generated / stored / env override). */
  keysReady: boolean;
  /** (b) Public key registered on the phone number. */
  publicKey: boolean;
  /** (c) The appointment flow was created by this run (false = reused/failed). */
  flowCreated: boolean;
  /** (c/d) A flow id is known (created now or already stored). */
  flowId: string | null;
  /** (d) Flow is PUBLISHED or PUBLISHING. */
  published: boolean;
  /** Raw Meta flow status after provisioning (PUBLISHED / PUBLISHING / DRAFT / …). */
  flowStatus: string | null;
  /** Verbatim error messages, one per failed step (Meta permission errors from
   *  unapproved App Review are EXPECTED here and reported verbatim). */
  errors: string[];
}

interface RestaurantCreds {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string | null;
}

// ─── Services for the appointment flow ──────

/**
 * Bookable services for the Flow JSON — the restaurant's available menu items
 * (menu_items doubles as the service catalog for salon/clinic/education
 * verticals; appointment bookings are validated against it at submit time).
 * Falls back to 3 generic services when the menu is empty so the flow still
 * provisions end-to-end.
 */
async function getFlowServices(restaurantId: string): Promise<FlowServiceOption[]> {
  const { data } = await supabaseAdmin
    .from('menu_items')
    .select('id, name, price')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)
    .order('display_order')
    .limit(30);

  const items = ((data ?? []) as Record<string, unknown>[])
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? '').trim(),
      price: typeof item.price === 'number' ? item.price : 0,
    }))
    .filter((item) => item.id.length > 0 && item.name.length > 0);

  if (items.length > 0) return items;

  // NOTE: generic services let the flow provision, but the endpoint validates
  // service_id against menu_items at booking time — add real services in the
  // dashboard, then hit "Provision now" to refresh the flow with them.
  return [
    { id: 'generic-consultation', name: 'Consultation', price: 0 },
    { id: 'generic-standard', name: 'Standard Service', price: 0 },
    { id: 'generic-premium', name: 'Premium Service', price: 0 },
  ];
}

// ─── Credential + config persistence ────────

async function loadRestaurantCreds(restaurantId: string): Promise<RestaurantCreds | null> {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('whatsapp_phone_id, whatsapp_access_token, whatsapp_waba_id')
    .eq('id', restaurantId)
    .maybeSingle();
  const row = data as Record<string, unknown> | null;
  if (!row) return null;

  const phoneNumberId = typeof row.whatsapp_phone_id === 'string' ? row.whatsapp_phone_id : '';
  const accessToken =
    typeof row.whatsapp_access_token === 'string' ? row.whatsapp_access_token : '';
  const wabaId = typeof row.whatsapp_waba_id === 'string' && row.whatsapp_waba_id ? row.whatsapp_waba_id : null;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken, wabaId };
}

/**
 * Merge keys into restaurants.business_config — read-then-write so other
 * keys are never clobbered (same pattern as the address-capture cart update
 * in the orchestrator).
 */
async function mergeBusinessConfig(
  restaurantId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('business_config')
    .eq('id', restaurantId)
    .single();
  const current =
    ((data as Record<string, unknown> | null)?.business_config as Record<string, unknown>) ?? {};
  const { error } = await supabaseAdmin
    .from('restaurants')
    .update({ business_config: { ...current, ...updates } })
    .eq('id', restaurantId);
  if (error) throw new Error(`business_config merge failed: ${error.message}`);
}

/**
 * Best-effort lookup of the appointment flow by name — used to ADOPT the
 * flow after a failed run: Meta's single-call create+publish can create the
 * flow but fail on the publish step (e.g. code 139002 while the endpoint is
 * not yet live), and the flow id must still be persisted so the next run
 * (and the orchestrator, once published) can use it.
 */
async function findAppointmentFlow(
  wabaId: string,
  accessToken: string
): Promise<{ id: string; status: string | null } | null> {
  try {
    const found = (await listFlows(wabaId, accessToken)).find(
      (f) => f.name === APPOINTMENT_FLOW_NAME
    );
    return found ? { id: found.id, status: found.status ?? null } : null;
  } catch {
    return null;
  }
}

// ─── ensureFlowsProvisioned ─────────────────

/**
 * Idempotent, never-throws provisioning of WhatsApp Flows for a restaurant:
 * keypair → public-key registration → appointment flow create/reuse →
 * publish → persist flow id. Safe to call from anywhere (connect route,
 * server actions, scripts). Returns a per-step status report.
 */
export async function ensureFlowsProvisioned(restaurantId: string): Promise<FlowsProvisionReport> {
  const report: FlowsProvisionReport = {
    restaurantId,
    keysReady: false,
    publicKey: false,
    flowCreated: false,
    flowId: null,
    published: false,
    flowStatus: null,
    errors: [],
  };

  // ── Credentials ──
  let creds: RestaurantCreds | null = null;
  try {
    creds = await loadRestaurantCreds(restaurantId);
  } catch (error) {
    report.errors.push(`Could not load restaurant WhatsApp credentials: ${(error as Error).message}`);
  }
  if (!creds) {
    report.errors.push(
      'WhatsApp is not connected (missing phone number id or access token) — connect a number first.'
    );
    logProvisioned(report);
    return report;
  }
  const { phoneNumberId, accessToken, wabaId } = creds;

  // A previously stored flow id counts as "known" even when this run's
  // create step fails (e.g. App Review pending) — the report stays honest.
  let storedFlowId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('restaurants')
      .select('business_config')
      .eq('id', restaurantId)
      .single();
    const config =
      ((data as Record<string, unknown> | null)?.business_config as Record<string, unknown>) ?? {};
    if (typeof config.flow_appointment_id === 'string' && config.flow_appointment_id) {
      storedFlowId = config.flow_appointment_id;
      report.flowId = storedFlowId;
    }
  } catch (error) {
    report.errors.push(`Could not read business_config: ${(error as Error).message}`);
  }

  // ── (a) App-wide keypair ──
  let publicKeyPem: string | null = null;
  try {
    const keys = await getOrCreateFlowKeys();
    publicKeyPem = keys.publicKeyPem;
    report.keysReady = true;
  } catch (error) {
    report.errors.push(`Keypair provisioning failed: ${(error as Error).message}`);
  }

  // ── (b) Register the public key on the phone number ──
  if (publicKeyPem) {
    try {
      await setBusinessPublicKey(phoneNumberId, accessToken, publicKeyPem);
      report.publicKey = true;
    } catch (error) {
      report.errors.push(`Public key registration failed: ${(error as Error).message}`);
    }
  }

  // ── (c) + (d) Appointment flow: create/reuse, then publish ──
  let flowStepOk = false;
  if (wabaId) {
    try {
      const services = await getFlowServices(restaurantId);
      const ensured = await ensureFlow({
        wabaId,
        accessToken,
        name: APPOINTMENT_FLOW_NAME,
        endpointUri: flowsEndpointUri(),
        categories: ['APPOINTMENT_BOOKING'],
        flowJson: buildAppointmentFlow(services),
        applicationId: process.env.NEXT_PUBLIC_META_APP_ID || undefined,
        // Don't block the (often fire-and-forget) caller on publish polling —
        // we read the status once below.
        waitForPublish: false,
      });
      report.flowCreated = ensured.created;
      report.flowId = ensured.flowId ?? report.flowId;
      report.flowStatus = ensured.status;
      if (ensured.validationErrors.length > 0) {
        report.errors.push(
          `Flow JSON validation errors: ${ensured.validationErrors
            .map((issue) => issue.error ?? issue.message ?? 'unknown')
            .join('; ')}`
        );
      }
      flowStepOk = true;
    } catch (error) {
      // Permission errors from unapproved App Review land here — reported
      // verbatim (known external gate). A create+publish can also CREATE the
      // flow but fail on the publish step (e.g. 139002 while the endpoint is
      // not yet deployed) — adopt the draft so the flow id is still persisted
      // and the next run retries publishing.
      report.errors.push(`Appointment flow creation failed: ${(error as Error).message}`);
      if (!report.flowId) {
        const found = await findAppointmentFlow(wabaId, accessToken);
        if (found) {
          report.flowId = found.id;
          report.flowStatus = found.status;
          report.errors.push(
            `Adopted existing "${APPOINTMENT_FLOW_NAME}" flow (status ${found.status ?? 'UNKNOWN'}) — publishing retries on the next run.`
          );
        }
      }
      if (report.flowId && !report.flowStatus) {
        // Best-effort status read so the report reflects the (draft) state.
        try {
          report.flowStatus = await getFlowStatus(report.flowId, accessToken);
        } catch {
          // status unreadable — leave null, the error above is the story
        }
      }
    }
  } else {
    report.errors.push('WABA id is missing — reconnect WhatsApp in Settings → WhatsApp.');
  }

  // ── (d) explicit publish when ensureFlow left the flow a draft ──
  // (skipped after a failed step (c) — the failure was usually the publish
  // call itself; retrying it here would only duplicate the error)
  if (flowStepOk && report.flowId && report.flowStatus === 'DRAFT') {
    try {
      await startPublishing(report.flowId, accessToken);
      report.flowStatus = (await getFlowStatus(report.flowId, accessToken)) ?? 'PUBLISHING';
    } catch (error) {
      report.errors.push(`Flow publish failed: ${(error as Error).message}`);
    }
  }
  report.published = report.flowStatus === 'PUBLISHED' || report.flowStatus === 'PUBLISHING';

  // ── (e) Persist the flow id (merge — never clobber other keys) ──
  if (report.flowId) {
    try {
      await mergeBusinessConfig(restaurantId, {
        flow_appointment_id: report.flowId,
        flows_provisioned_at: new Date().toISOString(),
      });
    } catch (error) {
      report.errors.push(`Could not save the flow id: ${(error as Error).message}`);
    }
  }

  // ── (f) Activity log ──
  logProvisioned(report);

  return report;
}

function logProvisioned(report: FlowsProvisionReport): void {
  logActivity({
    restaurantId: report.restaurantId,
    actorType: 'system',
    action: 'whatsapp.flows_provisioned',
    details: {
      keys_ready: report.keysReady,
      public_key: report.publicKey,
      flow_created: report.flowCreated,
      published: report.published,
      flow_id: report.flowId,
      flow_status: report.flowStatus,
      errors: report.errors,
    },
  });
}
