// ============================================
// AssistMint — WhatsApp Flows Webhook Bridge
// Receives flow_response webhooks, verifies the
// flow token created at send time, and forwards
// the screen data to the flow response handler
// (src/lib/flows/handle-flow-response.ts).
// ============================================

import { verifyFlowToken, type FlowTokenPayload } from '@/lib/flows/token';

/**
 * Expected shape of the FLOWS agent's webhook-facing handler. The flows
 * data-exchange endpoint (src/app/api/whatsapp/flows-endpoint/route.ts) is
 * the real-time path; this bridge exists for the flow_response MESSAGE
 * webhook (completion signal + submitted data) so it can be persisted or
 * acknowledged without going through the encrypted endpoint.
 */
interface FlowResponseHandlerModule {
  handleFlowResponse?: (
    tokenPayload: FlowTokenPayload,
    screenData: Record<string, unknown>
  ) => Promise<void> | void;
}

/**
 * Handle a WhatsApp flow_response webhook payload:
 * - verify the HMAC flow_token created when the flow was sent
 * - parse the response_json screen data
 * - forward both to handleFlowResponse when the FLOWS agent exports it
 *   (graceful no-op otherwise — the endpoint path has usually already
 *   processed the submission in real time)
 */
export async function handleFlowResponseWebhook(params: {
  phoneNumberId?: string;
  from: string;
  messageId?: string;
  flowToken: string;
  responseJson: string | Record<string, unknown>;
}): Promise<void> {
  const { flowToken, responseJson } = params;

  // 1. Verify the token created when the flow message was sent
  const tokenPayload = verifyFlowToken(flowToken);
  if (!tokenPayload) {
    console.warn('[Flows Bridge] Invalid or unsigned flow_token — ignoring flow response');
    return;
  }

  // 2. Parse the screen data (response_json arrives as a JSON string)
  let screenData: Record<string, unknown> = {};
  if (typeof responseJson === 'string' && responseJson.trim()) {
    try {
      screenData = JSON.parse(responseJson) as Record<string, unknown>;
    } catch {
      console.warn('[Flows Bridge] Malformed response_json — treating as empty');
    }
  } else if (responseJson && typeof responseJson === 'object') {
    screenData = responseJson;
  }

  // 3. Forward to the FLOWS agent's handler. The import is dynamic + cast so
  // the build never breaks if the handleFlowResponse export is still being
  // iterated on by the flows agent (it currently ships handleFlowRequest for
  // the encrypted endpoint path).
  try {
    const mod = (await import('@/lib/flows/handle-flow-response')) as unknown as FlowResponseHandlerModule;
    if (typeof mod?.handleFlowResponse === 'function') {
      await mod.handleFlowResponse(tokenPayload, screenData);
    } else {
      console.log(
        `[Flows Bridge] Flow response received (flow=${tokenPayload.flow}, rid=${tokenPayload.rid}) — no webhook handler export yet, endpoint path handles submissions`
      );
    }
  } catch (e) {
    console.error('[Flows Bridge] Failed to load handle-flow-response module:', e);
  }
}
