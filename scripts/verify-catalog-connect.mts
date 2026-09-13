// LIVE PROBE — catalog ownership resolution + catalog CONNECT against Meta's
// real Graph API, using the connected restaurant's credentials from the live DB.
// Pattern from scripts/e2e-live-whatsapp.mts (Supabase service client + .env.local).
//
// Background: embedded-signup exchange tokens are client-scoped and do NOT
// list businesses via me/businesses, which used to break ensureCatalog with
// "Could not determine which Meta Business owns this WhatsApp account".
// The fix resolves the owning business via the phone number's health_status
// `BUSINESS` entity. This probe exercises every step of that resolution and
// then tries to CONNECT the business's existing catalog (e.g. one created by
// hand in Commerce Manager) to the WABA via POST /{wabaId}/product_catalogs.
//
// Every Meta response/error is printed VERBATIM.
//
// Run: npx tsx scripts/verify-catalog-connect.mts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GRAPH = "https://graph.facebook.com/v25.0";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface Creds {
  name: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}

async function getCreds(): Promise<Creds | null> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("name, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token")
    .not("whatsapp_phone_id", "is", null)
    .not("whatsapp_waba_id", "is", null)
    .not("whatsapp_access_token", "is", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, string>;
  return {
    name: r.name,
    phoneNumberId: r.whatsapp_phone_id,
    wabaId: r.whatsapp_waba_id,
    accessToken: r.whatsapp_access_token,
  };
}

/** Raw Graph call that returns the VERBATIM JSON body (success or error). */
async function rawGraph(
  path: string,
  accessToken: string,
  init?: { method?: string; body?: unknown }
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const resp = await fetch(`${GRAPH}/${path.replace(/^\/+/, "")}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await resp.json()) as Record<string, unknown>;
  } catch {
    body = { parse_error: `HTTP ${resp.status} with non-JSON body` };
  }
  return { ok: resp.ok, status: resp.status, body };
}

function verbatim(body: Record<string, unknown>): string {
  return JSON.stringify(body).slice(0, 600);
}

async function main() {
  const creds = await getCreds();
  if (!creds) {
    console.log("⚠️ No connected restaurant found — cannot run live catalog-connect probe");
    return;
  }
  console.log(
    `\n=== LIVE PROBE (catalog ownership + connect) — restaurant: ${creds.name} ===`);
  console.log(`    phone_number_id: ${creds.phoneNumberId}`);
  console.log(`    waba_id:         ${creds.wabaId}\n`);
  const { accessToken, wabaId, phoneNumberId } = creds;

  // ── Step 1: WABA `owner` field (fast path) ──
  console.log("▶ STEP 1 — GET /{wabaId}?fields=owner");
  const owner = await rawGraph(`${wabaId}?fields=owner`, accessToken);
  console.log(`   ${owner.ok ? "✅" : "❌"} HTTP ${owner.status} → ${verbatim(owner.body)}`);
  const ownerField =
    typeof owner.body.owner === "object" && owner.body.owner !== null
      ? (owner.body.owner as Record<string, unknown>).id
      : typeof owner.body.owner === "string"
        ? owner.body.owner
        : undefined;
  console.log(`   owner id: ${ownerField ?? "(not returned for this token)"}\n`);

  // ── Step 2: phone number health_status (BUSINESS entity) ──
  console.log("▶ STEP 2 — GET /{phoneNumberId}?fields=health_status (BUSINESS entity)");
  const health = await rawGraph(`${phoneNumberId}?fields=health_status`, accessToken);
  console.log(`   ${health.ok ? "✅" : "❌"} HTTP ${health.status}`);
  const entities =
    (health.body.health_status as Record<string, unknown> | undefined)?.entities as
      | Array<Record<string, unknown>>
      | undefined
      | undefined;
  let healthBusinessId: string | undefined;
  if (entities) {
    for (const e of entities) {
      console.log(
        `   entity ${String(e.entity_type).padEnd(12)} id=${String(e.id)} can_send_message=${String(e.can_send_message)}`
      );
      if (e.entity_type === "BUSINESS" && typeof e.id === "string") healthBusinessId = e.id;
    }
  } else {
    console.log(`   (no entities in response) → ${verbatim(health.body)}`);
  }
  console.log(`   BUSINESS entity id: ${healthBusinessId ?? "(none found)"}\n`);

  // ── Step 3: me/businesses (the OLD broken path — expected to fail) ──
  console.log("▶ STEP 3 — GET /me/businesses (old path; expected to fail for embedded-signup tokens)");
  const businesses = await rawGraph(`me/businesses?fields=id,name`, accessToken);
  console.log(`   ${businesses.ok ? "✅" : "❌"} HTTP ${businesses.status} → ${verbatim(businesses.body)}\n`);

  // ── Step 4: production resolution logic (the fixed resolveOwningBusiness) ──
  console.log("▶ STEP 4 — resolveOwningBusiness (production logic from src/lib/whatsapp/catalog.ts)");
  const { resolveOwningBusiness } = await import("../src/lib/whatsapp/catalog");
  const resolved = await resolveOwningBusiness({
    wabaId,
    accessToken,
    phoneNumberId,
  });
  console.log(
    `   ${resolved.businessId ? "✅" : "❌"} → businessId=${resolved.businessId ?? "null"}${resolved.error ? ` error=${resolved.error}` : ""}\n`
  );
  if (!resolved.businessId) {
    console.log("=== RESULT: owning business could NOT be resolved — catalog connect cannot proceed. ===");
    return;
  }
  const businessId = resolved.businessId;

  // ── Step 5: is a catalog already connected to the WABA? ──
  console.log("▶ STEP 5 — GET /{wabaId}?fields=catalogs (already connected?)");
  const catalogsField = await rawGraph(`${wabaId}?fields=catalogs`, accessToken);
  console.log(`   ${catalogsField.ok ? "✅" : "❌"} HTTP ${catalogsField.status} → ${verbatim(catalogsField.body)}`);
  const connectedCatalogs =
    ((catalogsField.body.catalogs as Record<string, unknown> | undefined)?.data as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const connectedId = typeof connectedCatalogs[0]?.id === "string" ? connectedCatalogs[0].id : undefined;
  console.log(`   connected catalog id: ${connectedId ?? "(none)"}\n`);
  if (connectedId) {
    console.log("=== RESULT: a catalog is ALREADY connected to the WABA — nothing to connect. ===");
    return;
  }

  // ── Step 6: list the business's owned_product_catalogs (UI-created catalog) ──
  console.log(`▶ STEP 6 — GET /{businessId}/owned_product_catalogs?fields=id,name`);
  const owned = await rawGraph(`${businessId}/owned_product_catalogs?fields=id,name`, accessToken);
  console.log(`   ${owned.ok ? "✅" : "❌"} HTTP ${owned.status} → ${verbatim(owned.body)}`);
  const ownedList = (owned.body.data as Array<Record<string, unknown>> | undefined) ?? [];
  if (ownedList.length === 0) {
    console.log("   (no owned catalogs visible to this token)");
    // The listing edge is gated, but we can still surface the gate on the
    // CONNECT edge itself: POST with an invalid catalog id (0) can never
    // connect anything real, and the error reveals whether the endpoint is
    // permission-gated (#200) or reachable (invalid-id error).
    console.log("\n▶ STEP 6b — POST /{wabaId}/product_catalogs {catalog_id: 0} (gate probe, invalid id)");
    const gate = await rawGraph(`${wabaId}/product_catalogs`, accessToken, {
      method: "POST",
      body: { catalog_id: "0" },
    });
    console.log(`   ${gate.ok ? "✅" : "❌"} HTTP ${gate.status} VERBATIM Meta error → ${verbatim(gate.body)}`);
    console.log(
      "\n=== RESULT: no catalog found on the owning business — create one in Commerce Manager first. ==="
    );
    return;
  }
  for (const c of ownedList) console.log(`   catalog ${String(c.id)} — "${String(c.name ?? "")}"`);
  const catalogId = String(ownedList[0].id);
  console.log(`   will try to connect: ${catalogId}\n`);

  // ── Step 7: CONNECT the catalog to the WABA ──
  console.log(`▶ STEP 7 — POST /{wabaId}/product_catalogs {catalog_id: ${catalogId}}`);
  const connect = await rawGraph(`${wabaId}/product_catalogs`, accessToken, {
    method: "POST",
    body: { catalog_id: catalogId },
  });
  const connectErr = connect.body.error as Record<string, unknown> | undefined;
  const connectMsg = String(connectErr?.message ?? "");
  const alreadyConnected =
    /already connected|already has a catalog|catalog already/i.test(connectMsg);
  if (connect.ok) {
    console.log(`   ✅ HTTP ${connect.status} → ${verbatim(connect.body)}`);
  } else if (alreadyConnected) {
    console.log(`   ✅ HTTP ${connect.status} (already connected — treating as success) → ${verbatim(connect.body)}`);
  } else {
    console.log(`   ❌ HTTP ${connect.status} VERBATIM Meta error → ${verbatim(connect.body)}`);
  }
  console.log("");

  // ── Step 8: verify the connection is now visible on the WABA ──
  console.log("▶ STEP 8 — verify GET /{wabaId}?fields=catalogs");
  const verify = await rawGraph(`${wabaId}?fields=catalogs`, accessToken);
  console.log(`   ${verify.ok ? "✅" : "❌"} HTTP ${verify.status} → ${verbatim(verify.body)}`);
  const verifyList =
    ((verify.body.catalogs as Record<string, unknown> | undefined)?.data as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const finalId = typeof verifyList[0]?.id === "string" ? verifyList[0].id : undefined;

  console.log(
    finalId
      ? `\n=== RESULT: catalog ${finalId} IS connected to the WABA — syncCatalogToMeta can now sync items. ===`
      : connect.ok || alreadyConnected
        ? "\n=== RESULT: connect call succeeded but the catalogs field does not show it yet (may propagate) — retry sync. ==="
        : "\n=== RESULT: catalog connect BLOCKED by Meta — see verbatim error above. ==="
  );
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
