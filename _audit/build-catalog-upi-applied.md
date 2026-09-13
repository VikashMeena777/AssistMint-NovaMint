# Build: Catalog Auto-Creation + Simple In-Chat UPI

Date: 2026-09-13
Status: COMPLETE — `npx tsc --noEmit` passes clean. Live verification run against the connected restaurant (see below).

## What was built

### 1. Catalog auto-creation — `ensureCatalog` (src/lib/whatsapp/catalog.ts)

**Meta API research findings (documented, real):**
- `POST /{business_id}/owned_product_catalogs` with `{ name, vertical: "commerce" }` creates a ProductCatalog on a business → returns `{ id }`. Requires the `catalog_management` permission (Marketing API docs: developers.facebook.com/docs/graph-api/reference/business/owned_product_catalogs/).
- `POST /{waba_id}/product_catalogs` with `{ catalog_id }` connects a catalog to the WABA → `{ success: true }` (developers.facebook.com/docs/graph-api/reference/whats-app-business-account/product_catalogs/).
- Owning-business discovery: the WABA node's `owner` field (not exposed for embedded-signup system-user tokens), or `GET /me/businesses` → `GET /{business_id}/owned_whatsapp_business_accounts` scan (needs `business_management`).

`ensureCatalog({ wabaId, accessToken, name })`:
1. `getCatalogId` (the `?fields=catalogs` form) — already connected? done.
2. Resolve the owning business (owner field fast path → businesses scan fallback).
3. Reuse a same-named catalog from `owned_product_catalogs` when present (idempotent re-runs), else create one via `POST /{business_id}/owned_product_catalogs`.
4. Connect via `POST /{waba_id}/product_catalogs`.
5. Verify with `getCatalogId`. Returns `{ catalogId, created, connected, needsManualCreation, error }` with **verbatim Meta errors**.

### 2. syncCatalogToMeta now auto-creates (src/lib/actions/whatsapp-actions.ts)

When `getCatalogId` returns null, the action calls `ensureCatalog` (named after the restaurant — `requireOwner`/`requireConnected` now select `name` and expose `restaurantName`). If a catalog id is obtained, the sync proceeds end-to-end as before. If Meta blocks the API path, the action:
- persists `business_config.catalog_setup_needed = true` (merge, never clobber),
- returns `needsCatalogSetup: true` + a plain-language error with the verbatim Meta error appended.

On success it persists `catalog_id`, `catalog_setup_needed: false`, `last_catalog_sync_at`, `last_catalog_sync_summary` (merge) and reports `catalogCreated` so the UI can celebrate.

### 3. Manual-creation guide in the catalog sync card (src/components/dashboard/catalog-sync-card.tsx)

When setup is needed (either a failed sync or the `initialSetupNeeded` flag set at connect time), the card shows a plain-language, numbered guide with the **Open Meta Commerce Manager** deep-link (https://business.facebook.com/commerce/): create catalog → connect the WhatsApp asset in catalog Settings → come back and press Sync again. No jargon ("order_details", "retailer id", etc. never appear). The verbatim Meta error is shown small/muted for debugging.

### 4. Auto-catalog on connect (src/app/api/whatsapp/connect/route.ts)

Added block **6.7** as a separate fire-and-forget (parallel to, not touching, the 6.5 business-profile block and the parallel agent's 6.6 flows block): `ensureCatalog` → upsert all active menu items (service-role DB reads, direct lib imports — no cookie-context server actions after the response) → best-effort `setCommerceSettings(cart on, catalog visible)` → merge `catalog_id` / `last_catalog_sync_at` / summary into `business_config`. On blocked auto-creation it sets `catalog_setup_needed: true` so the dashboard guide shows immediately. Never blocks or fails connect.

### 5. Simple UPI setup (Settings → Payments)

- **`saveUpiVpa` action** (src/lib/actions/restaurant-actions.ts): ownership-checked, validates the UPI ID shape (`name@bank`), reads the CURRENT `business_config` fresh from the DB and merges (`upi_vpa: value | null`) through the allowlisted `updateRestaurantSettings` (`business_config` is in `SETTINGS_ALLOWED_FIELDS` — verified). Empty string clears it.
- **`UpiSetupCard`** (src/components/dashboard/upi-setup-card.tsx): one input ("Your UPI ID", e.g. vikash@okhdfcbank), one-line help ("Open any UPI app → your profile → copy your UPI ID"), Save button with toast feedback, StatusPill status line:
  - set: "Customers can now pay inside WhatsApp — when they choose Pay Online, they'll see a UPI invoice in chat."
  - not set: "Not set — customers get a payment link instead."
- Rendered at the **top of the Payments tab** (outside the Cashfree loading gate) in src/app/(app)/dashboard/settings/page.tsx.
- The catalog sync card now also receives `initialSetupNeeded` from `business_config.catalog_setup_needed`.

### 6. Payment path verified end-to-end (no wiring bugs found)

Traced `handleOnlinePayOrder` (orchestrator) → `createBotPaymentLink` (bot-payment) → `sendOrderDetailsMessage` (payments.ts) → Cashfree webhook → `sendInChatOrderStatusUpdate` (in-chat-payment.ts):
- `createBotPaymentLink(restaurantId, cartId, phone, name, cart.total, isCart=true)` positional args match the signature; returns link or null.
- The in-chat UPI send happens AFTER the fallback link reply, gated on `paymentLink && upi_vpa && creds`.
- `business_config.upi_vpa` is read correctly; `buildUpiIntentLink({ vpa, payeeName, amountInPaise, note, transactionRef })` matches `UpiIntentParams`.
- `sendOrderDetailsMessage` param names all match: items `{ name, amountInPaise: unit_price + addons_total, quantity }`, `totalAmountInPaise`/`taxInPaise`/`shippingInPaise`/`discountInPaise`, `paymentConfig: { upiIntentLink }` — and the amount math satisfies the helper's total = subtotal + tax + shipping − discount validation (cart-engine computes subtotal identically).
- The entire order_details send + the payments-row `in_chat_invoice` flagging are each try/caught — a failure can never break the fallback payment-link flow. The webhook's `sendInChatOrderStatusUpdate` is fire-and-forget and no-ops without the flag.

## Live verification (scripts/verify-catalog-upi.mts, run 2026-09-13)

Against the live connected restaurant "Vikash Eats":

- (a) `getCatalogId` → `null` (no catalog connected to the WABA yet) — the API itself works.
- (b) `ensureCatalog` → `needsManualCreation: true`. **VERBATIM Meta error:** `Could not determine which Meta Business owns this WhatsApp account: WhatsApp API error 400 (code 100): (#100) Missing Permission` — `GET /me/businesses` is rejected for the embedded-signup system-user token (identity: "AssistMint System User"). **This is the expected external App Review gate** (needs `business_management` / `catalog_management` approved on the Meta app). Until then the dashboard guides the owner through Commerce Manager.
- (b-probe) `POST /{waba_id}/product_catalogs` is NOT permission-gated (a fake id returned only `(#100) Param catalog_id is not a valid Product Catalog ID`), so once a catalog exists and is connected — manually via the guide, or automatically after App Review — everything downstream works.
- (c) Item upsert/delete skipped (no catalog id) — will exercise once a catalog exists.
- (d) `business_config.upi_vpa` → NOT SET (customers currently get a payment link). Owner can now set it from Settings → Payments in one field.

## External gates to clear (owner / Meta side, not code)

1. **Meta App Review**: request `catalog_management` + `business_management` for the embedded-signup flow (configured in the Meta App Dashboard's WhatsApp → Embedded Signup config; `NEXT_PUBLIC_META_CONFIG_ID` solution). Once approved, `ensureCatalog` auto-creates catalogs with zero owner steps.
2. Until then: the one-time Commerce Manager guide (4 plain steps) in the dashboard catalog card.
3. **WhatsApp Payments**: in-chat `order_details` invoices additionally require the WhatsApp Payments product + India onboarding approved by Meta for production sends (sandbox/eligible accounts send immediately). The code path is complete; the send is fail-safe regardless.

## Files changed

- `src/lib/whatsapp/catalog.ts` — added `EnsureCatalogResult`, `resolveOwningBusiness`, `ensureCatalog`.
- `src/lib/actions/whatsapp-actions.ts` — auto-create in `syncCatalogToMeta`, `restaurantName` on `requireConnected` (select includes `name`), `catalogCreated` in result, `needsCatalogSetup` outer flag, business_config persistence of `catalog_id`/`catalog_setup_needed`.
- `src/components/dashboard/catalog-sync-card.tsx` — Commerce Manager step-by-step guide, `initialSetupNeeded` prop, auto-created toast.
- `src/app/api/whatsapp/connect/route.ts` — block 6.7 auto-catalog + menu sync fire-and-forget (parallel agent's flows block untouched).
- `src/lib/actions/restaurant-actions.ts` — added `saveUpiVpa` (ownership-checked, validating, merge-safe).
- `src/components/dashboard/upi-setup-card.tsx` — NEW: one-input UPI card (Bahikhata styling, StatusPill, toasts).
- `src/app/(app)/dashboard/settings/page.tsx` — UpiSetupCard at top of Payments tab; `initialSetupNeeded` passed to CatalogSyncCard.
- `scripts/verify-catalog-upi.mts` — NEW live verification script.
