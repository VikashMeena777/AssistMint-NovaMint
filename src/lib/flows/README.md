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
| `token.ts` | Stateless, HMAC-SHA256-signed flow tokens (`{rid, flow, phone, iat, exp, oid?, cid?, name?}`) passed as `flow_token` at send time and verified on every endpoint hit. |
| `definitions.ts` | Flow JSON v5.0 builders: `buildAppointmentFlow`, `buildFeedbackFlow`, `buildAddressFlow` + screen id constants. |
| `handle-flow-response.ts` | Routes decrypted requests to the next screen and persists outcomes (appointments, ratings/feedback, addresses) via the service layer. Exports `handleFlowRequest` (endpoint path) and `handleFlowResponse` (webhook path, idempotent). |
| `publish.ts` | Flows API helpers: `ensureFlow`, `createFlow` (single-call create+publish), `uploadFlowJson`, `startPublishing`, `listFlows`, `waitForFlowStatus`, `setBusinessPublicKey`. |
| `webhook-bridge.ts` | Bridge for the `flow_response` message webhook (owned by the webhook route agent) → verifies the token → calls `handleFlowResponse`. |
| `../app/api/whatsapp/flows-endpoint/route.ts` | The public HTTPS endpoint: GET health check + POST encrypted data exchange. |

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

## Environment variables

```bash
# 2048-bit RSA private key (PKCS#1 or PKCS#8 PEM). Multi-line PEMs in env
# vars should have literal \n escapes — normalizePrivateKeyPem handles both.
FLOWS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

# HMAC secret for signing flow tokens (falls back to WHATSAPP_APP_SECRET).
FLOWS_TOKEN_SECRET="some-long-random-string"
```

Generate the key pair:

```bash
openssl genrsa -out flows_private.pem 2048
openssl rsa -in flows_private.pem -pubout -out flows_public.pem
# Optional: convert to unencrypted PKCS#8 (Java-style tooling prefers it)
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in flows_private.pem -out flows_private_pkcs8.pem
```

`FLOWS_PRIVATE_KEY` is the single-tenant key this endpoint decrypts with.
(The Supabase `restaurants.business_config.flow_private_key` column can hold
a per-tenant backup copy — the endpoint itself cannot use per-restaurant
keys because the encrypted request does not identify the restaurant before
decryption.)

Or generate programmatically: `generateFlowKeyPair()` from `encryption.ts`.

## Public key registration (one-time, per phone number)

The public key must be registered for **each phone number** before any
endpoint-powered flow can be sent:

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

## Key rotation

1. Generate a new key pair (`openssl genrsa` or `generateFlowKeyPair()`).
2. Register the new **public** key via `setBusinessPublicKey` (or the app
   dashboard). The WhatsApp client re-fetches the public key on the next
   data exchange; if it holds a stale key we return 421 and it retries with
   the fresh key — so rotation is near-zero-downtime.
3. Update `FLOWS_PRIVATE_KEY` in the environment and redeploy.
4. Keep both private keys deployed briefly? Not needed — one env var per
   deployment. To be extra safe during the switch, deploy the new key
   immediately after registering the new public key.
5. Store the retired key offline (decrypting old captured traffic) and
   delete it once no longer required.

## Publishing flows

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

- [ ] App Review: Advanced Access for `whatsapp_business_management` +
      `whatsapp_business_messaging` (currently the platform blocker — see
      `_audit/research-whatsapp-features.md` §1)
- [ ] `FLOWS_PRIVATE_KEY` + `FLOWS_TOKEN_SECRET` set in the environment
- [ ] Public key registered for every sending phone number
      (`setBusinessPublicKey`)
- [ ] Endpoint live at a public HTTPS URL:
      `GET /api/whatsapp/flows-endpoint` returns `{"data":[{"status":"ready"}],"version":"3.0"}`
- [ ] WABA subscribed to Flows webhooks (`flow_response` etc. — webhook
      route owner; the bridge is `src/lib/flows/webhook-bridge.ts`)
- [ ] Meta app (1991613461489665) connected to each flow
      (`applicationId` in `ensureFlow`)
- [ ] Flows created + published via `ensureFlow` (check `validationErrors`)
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
- **`src/lib/whatsapp/flows.ts` publishFlow** targets `/{flowId}/publish`;
  the documented publish path is `/{flowId}/start_publishing`, which is what
  `publish.ts` uses. Flagged for the API client owner to reconcile.
