# AssistMint — WhatsApp Flows Framework (server side)

Implementation of WhatsApp Flows endpoint-powered flows: the encrypted
data-exchange endpoint Meta calls, Flow JSON (v5.0) builders for our vertical
flows, stateless HMAC flow tokens, outcome persistence, and the Flows publish
API helpers.

Spec (verified 2026-09-13 against the live docs):

- Implementing endpoint for Flows:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint
- Flows API (create/publish):
  https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi
- Flows Encryption (public key registration):
  https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/whatsapp-business-encryption
- Flow JSON reference:
  https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/flowjson

## Module map

| File | Purpose |
|---|---|
| `encryption.ts` | RSA-OAEP-SHA256 + AES-GCM request decryption, AES-GCM response encryption (bit-flipped IV), key pair generation. Pure functions, unit-testable. |
| `keys.ts` | **Zero-manual key management**: `getOrCreateFlowKeys()` returns the app-wide RSA keypair — `FLOWS_PRIVATE_KEY` env override when set, else the self-provisioned keypair stored in the service-role-only `app_config` table (migration `010_app_config.sql`). Race-safe (on-conflict-do-nothing + re-read). |
| `token.ts` | Stateless, HMAC-SHA256-signed flow tokens (`{rid, flow, phone, iat, exp, oid?, cid?, name?}`) passed as `flow_token` at send time and verified on every endpoint hit. |
| `definitions.ts` | Flow JSON v5.0 builders: `buildAppointmentFlow`, `buildFeedbackFlow`, `buildAddressFlow` + screen id constants. |
| `handle-flow-response.ts` | Routes decrypted requests to the next screen and persists outcomes (appointments, ratings/feedback, addresses) via the service layer. Exports `handleFlowRequest` (endpoint path) and `handleFlowResponse` (webhook path, idempotent). |
| `auto-setup.ts` | **Zero-manual lifecycle**: `ensureFlowsProvisioned(restaurantId)` — keypair → public-key registration → "AssistMint Booking" flow create/reuse (Flow JSON from the restaurant's menu) → publish → persist `flow_appointment_id` in `business_config`. Idempotent, never throws, returns a per-step report. Fired automatically by the WhatsApp connect route. |
| `publish.ts` | Flows API helpers: `ensureFlow`, `createFlow` (single-call create+publish), `uploadFlowJson`, `startPublishing`, `listFlows`, `waitForFlowStatus`, `setBusinessPublicKey`. |
| `webhook-bridge.ts` | Bridge for the `flow_response` message webhook (owned by the webhook route agent) → verifies the token → calls `handleFlowResponse`. |
| `../app/api/whatsapp/flows-endpoint/route.ts` | The public HTTPS endpoint: GET health check + POST encrypted data exchange. Self-provisions the keypair on the first Meta call. |

Sending flows (interactive `type: "flow"` messages) lives in the API client:
`src/lib/whatsapp/flows.ts` → `sendFlowMessage` (pass our `createFlowToken()`
output as `flowToken` and `flowAction: 'data_exchange'` when the first screen
needs endpoint data).

## How the encryption works

Every request/response between the WhatsApp client and our endpoint is
encrypted end-to-end with keys we own. Per the current documented protocol:

**Request (Meta → us), POST body (JSON or form-urlencoded):**

| Field | Encoding | Meaning |
|---|---|---|
| `encrypted_aes_key` | base64 | AES key (128-bit), encrypted with our registered RSA **public** key using RSA-OAEP with SHA-256 (`RSA/ECB/OAEPWithSHA-256AndMGF1Padding`) |
| `initial_vector` | base64 | The 128-bit AES-GCM IV, in the clear (legacy generations sent this RSA-encrypted as `encrypted_iv`, or prepended it inside the flow data — `decryptRequest` handles all three layouts) |
| `encrypted_flow_data` | base64 | `ciphertext ‖ auth_tag(16 bytes)`, AES-GCM (`AES/GCM/NoPadding`) with the AES key + IV |

Decryption (`decryptRequest`):
1. RSA-decrypt `encrypted_aes_key` with `FLOWS_PRIVATE_KEY` (OAEP-SHA256).
2. IV = decoded `initial_vector`; tag = last 16 bytes of `encrypted_flow_data`;
   ciphertext = the rest. AES-GCM open (algorithm auto-selected from key
   length: 128-bit per spec, 256-bit tolerated).
3. The plaintext is the JSON request: `{version: "3.0", action, screen, data, flow_token}`.

**Response (us → Meta):** AES-GCM with the **same AES key** and the
**bit-flipped IV** (every byte XOR `0xFF` — this is in all four official Meta
examples), output `base64(ciphertext ‖ auth_tag)` sent as a `text/plain`
body. `encryptResponse(payload, aesKey, iv, { flipIv })` — `flipIv` is wired
automatically from `decryptRequest`'s result (legacy layouts did not flip).

**Endpoint HTTP codes Meta expects:**

| Code | When |
|---|---|
| 200 | Encrypted screen/error payload (never 500 — Meta blocks endpoints on 5xx rates) |
| 421 | Payload cannot be decrypted (client re-fetches our public key and retries) |
| 427 | Flow token no longer valid — body `{"error_msg": "..."}`; CTA is disabled for the user |
| 432 | `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with the app secret) mismatch |

**Health check:** Meta periodically sends `GET` (must answer `{"data":[{"status":"ready"}],"version":...}`)
and, inside the encrypted channel, a `ping` action (answered with
`{"data":{"status":"active"}}`). Endpoints must respond within **10 seconds**
or flows get THROTTLED (10 msgs/hour) / BLOCKED.

## The zero-manual architecture (no setup required)

Nothing below needs a technical operator. On the first WhatsApp connect (and on
every "Provision now" press in Settings → WhatsApp Health), the system
self-provisions everything:

1. **Keypair** (`keys.ts` → `getOrCreateFlowKeys`): ONE 2048-bit RSA keypair
   per Meta app (the encrypted data-exchange request does not identify the
   restaurant before decryption, so it cannot be per-tenant). Stored in the
   Supabase `app_config` table (`flows_private_key` / `flows_public_key`,
   PEM strings) — RLS enabled with **no policies**, so only the service role
   can touch it. Generated on first use; concurrent callers converge on the
   first stored key. The flows endpoint self-provisions the same way on the
   first Meta call.
2. **Public key registration** (`publish.ts` → `setBusinessPublicKey` on
   `POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption`): registered for the
   connected phone number automatically.
3. **Appointment flow** (`auto-setup.ts` → `ensureFlow`): the "AssistMint
   Booking" flow (Flow JSON v5 built by `buildAppointmentFlow` from the
   restaurant's available menu items — 3 generic services when the menu is
   empty) is created with `endpoint_uri = ${APP_URL}/api/whatsapp/flows-endpoint`
   and published. Idempotent by flow name.
4. **Persistence**: the flow id lands in `restaurants.business_config.flow_appointment_id`
   (read-then-write merge — other keys are never clobbered) plus
   `flows_provisioned_at`, and an activity `whatsapp.flows_provisioned` is
   logged. Every step is individually guarded; the function never throws and
   returns a per-step report `{keysReady, publicKey, flowCreated, published,
   flowId, flowStatus, errors[]}` (Meta permission errors from unapproved App
   Review are reported verbatim — a known external gate).

The dashboard surfaces all of this in Settings → WhatsApp Health ("WhatsApp
Flows" card: status pill, flow name + id, last provisioned time, endpoint
health, "Provision now" with the inline report).

### Optional environment overrides

```bash
# OPTIONAL — pin a specific RSA private key (PKCS#1/PKCS#8 PEM, literal \n
# escapes accepted). When set it WINS over the auto-managed app_config
# keypair and the public key is derived from it. Only needed for
# single-tenant deployments that must reuse an existing key.
FLOWS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

# OPTIONAL — HMAC secret for signing flow tokens (falls back to
# WHATSAPP_APP_SECRET, which is already configured).
FLOWS_TOKEN_SECRET="some-long-random-string"
```

Everything works without either: the keypair self-provisions and the token
secret falls back. To force a fresh keypair, clear the `flows_private_key` /
`flows_public_key` rows in `app_config` (service-role only) and hit
"Provision now" — or set the env override above.

## Public key registration (automatic, per phone number)

Handled automatically by `ensureFlowsProvisioned` (step 2 above). For
reference, the underlying call:

```ts
import { setBusinessPublicKey } from '@/lib/flows/publish';

await setBusinessPublicKey(
  phoneNumberId,        // restaurants.whatsapp_phone_id
  accessToken,          // restaurants.whatsapp_access_token
  publicKeyPem          // -----BEGIN PUBLIC KEY----- ... (SPKI)
);
```

Equivalent curl (`POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption`):

```bash
curl -X POST "https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/whatsapp_business_encryption" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-urlencode "business_public_key=$(cat flows_public.pem)"
```

Verify with `GET` on the same path — `business_public_key_signature_status`
should be `VALID`.

## Key rotation (automatic path)

1. Clear the `flows_private_key` / `flows_public_key` rows in `app_config`
   (service-role only) — or set `FLOWS_PRIVATE_KEY` to the new key (it wins).
2. Press "Provision now" (Settings → WhatsApp Health) or reconnect the number —
   `ensureFlowsProvisioned` registers the new **public** key via
   `setBusinessPublicKey`. The WhatsApp client re-fetches the public key on
   the next data exchange; if it holds a stale key we return 421 and it
   retries with the fresh key — so rotation is near-zero-downtime.
3. The endpoint picks the new key up immediately (env override) or from the
   fresh `app_config` rows.
4. Store the retired key offline (decrypting old captured traffic) and delete
   it once no longer required.

## Publishing flows (automatic)

`ensureFlowsProvisioned` (fired by the connect route and the "Provision now"
button) wraps `ensureFlow` for the appointment flow:

```ts
import { ensureFlow } from '@/lib/flows/publish';
import { buildAppointmentFlow } from '@/lib/flows/definitions';

const result = await ensureFlow({
  wabaId: restaurant.whatsapp_waba_id,
  accessToken: restaurant.whatsapp_token,
  name: 'assistmint_appointment',
  endpointUri: 'https://<your-domain>/api/whatsapp/flows-endpoint',
  flowJson: buildAppointmentFlow(services), // services: {id, name, price(paise)}[]
  applicationId: '1991613461489665',        // AssistMint Meta app
});
// result: { flowId, status: 'PUBLISHED' | 'PUBLISHING' | 'DRAFT', created, validationErrors }
```

`ensureFlow` is idempotent by flow name: a PUBLISHED flow is reused as-is; a
DRAFT gets the fresh Flow JSON uploaded and is published; anything else
throws with guidance. Publishing requires (Meta-enforced): the endpoint live
and healthy, the public key registered, an application connected, and the
WABA subscribed to Flows webhooks.

## Sending a flow (send time)

```ts
import { sendFlowMessage } from '@/lib/whatsapp/flows';
import { createFlowToken } from '@/lib/flows/token';

const flowToken = createFlowToken({
  rid: restaurant.id,
  flow: 'appointment',            // 'appointment' | 'feedback' | 'address'
  phone: customerPhone,
  name: customerName,             // optional, used for prefill/confirmations
  oid: lastOrderId,               // feedback flow: rates that order
});

await sendFlowMessage({
  phoneNumberId, accessToken, to: customerPhone,
  flowId,                                  // from ensureFlow
  flowCta: 'Book appointment',
  bodyText: 'Tap below to book your slot 👇',
  flowToken,
  flowAction: 'data_exchange',             // endpoint renders the first screen (INIT)
});
```

Note: with `flowAction: 'navigate'` (default) the client renders the first
screen from the static Flow JSON without calling the endpoint — fine for all
three of our flows since their first screens are static.

## Outcome persistence & webhooks

Two delivery paths for submitted data, both idempotent:

1. **Encrypted endpoint** (`handleFlowRequest`) — real-time, screen by screen.
   APPOINTMENT → creates `appointments` rows (via `appointment-service`),
   validates date/time against available slots; FEEDBACK → saves
   `orders.rating/feedback` when the token carries an order id, else logs a
   conversation note; ADDRESS → appends to `customers.delivery_addresses`,
   fills `saved_name`, and attaches the address to the active
   `cart_sessions.metadata` for checkout.
2. **`flow_response` webhook** (`webhook-bridge.ts` → `handleFlowResponse`) —
   fires after the flow completes with the accumulated form data. Safe
   duplicates of the endpoint path (conflict/order-state/note checks), so
   outcomes are persisted once and customers are never double-texted.

## Deployment checklist

- [ ] `010_app_config.sql` applied (the keypair store; RLS-locked, service-role only)
- [ ] App Review: Advanced Access for `whatsapp_business_management` +
      `whatsapp_business_messaging` (currently the platform blocker — see
      `_audit/research-whatsapp-features.md` §1; until approved, flow
      creation returns Meta permission errors, reported verbatim by the
      provisioning report)
- [ ] Endpoint live at a public HTTPS URL:
      `GET /api/whatsapp/flows-endpoint` returns `{"data":[{"status":"ready"}],"version":"3.0"}`
      (the keypair self-provisions on this call — no env var needed)
- [ ] WABA subscribed to Flows webhooks (`flow_response` etc. — webhook
      route owner; the bridge is `src/lib/flows/webhook-bridge.ts`)
- [ ] Connect a number — `ensureFlowsProvisioned` runs automatically and
      logs `whatsapp.flows_provisioned`; verify the "WhatsApp Flows" card in
      Settings → WhatsApp Health (or press "Provision now")
- [ ] Monitor `GET /{FLOW_ID}?fields=health_status` — endpoints that are
      slow (>10s) or error-prone get THROTTLED (10 msgs/h) then BLOCKED

## Known caveats

- **Flow JSON version**: builders emit v5.0 (frozen Sep 2025, still the
  version used in Meta's current doc examples). Endpoint flows require
  `data_api_version: "3.0"` + `routing_model`, both emitted by the builders.
- **`min-date`/`max-date`** on the appointment DatePicker are baked at build
  time; the handler also validates that the submitted date is not in the
  past. Re-run `ensureFlow` (new name or draft path) to refresh the window.
- **Form data accumulation**: later screens read fields submitted on earlier
  screens (standard client behavior, same assumption as Meta's own booking
  examples). Missing values produce a friendly error screen, never a crash.
- **Publish path**: `POST /{FLOW_ID}/publish` (verified live 2026-09-13 —
  the older `/{flowId}/start_publishing` edge is gone and answers code 2500
  "Unknown path components"). Both `publish.ts` (`startPublishing`) and the
  API client (`src/lib/whatsapp/flows.ts` → `publishFlow`) now use it.
