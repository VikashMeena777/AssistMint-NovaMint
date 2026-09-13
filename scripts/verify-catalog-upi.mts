// LIVE VERIFY — catalog sync + in-chat UPI config against the LIVE restaurant
// and Meta's real Graph API. Pattern from scripts/e2e-live-whatsapp.mts.
//
// What it does:
//   (a) calls getCatalogId and prints the result
//   (b) if no catalog exists, tries ensureCatalog (the new auto-creation path)
//       so the real Meta permission gate surfaces verbatim
//   (c) if a catalog exists, syncs ONE throwaway test item via
//       upsertCatalogItem and deletes it again
//   (d) prints business_config.upi_vpa (the in-chat UPI setting)
//
// Meta API errors are printed VERBATIM — unapproved-permission errors on the
// catalog APIs (catalog_management / business_management) are an EXPECTED
// external gate until App Review approves them; the dashboard then guides
// the owner through Commerce Manager instead.
//
// Run: npx tsx scripts/verify-catalog-upi.mts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface LiveRestaurant {
  id: string;
  name: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  businessConfig: Record<string, unknown> | null;
}

async function getLiveRestaurant(): Promise<LiveRestaurant | null> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token, business_config")
    .not("whatsapp_phone_id", "is", null)
    .not("whatsapp_waba_id", "is", null)
    .not("whatsapp_access_token", "is", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const rawConfig = r.business_config;
  return {
    id: String(r.id),
    name: String(r.name || "Unknown"),
    phoneNumberId: String(r.whatsapp_phone_id),
    wabaId: String(r.whatsapp_waba_id),
    accessToken: String(r.whatsapp_access_token),
    businessConfig:
      rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)
        ? (rawConfig as Record<string, unknown>)
        : null,
  };
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function main() {
  const live = await getLiveRestaurant();
  if (!live) {
    console.log("⚠️ No connected restaurant found — cannot run live verification");
    return;
  }
  console.log(`\n=== LIVE VERIFY (catalog + UPI) — restaurant: ${live.name} (${live.id}) ===\n`);

  const creds = { wabaId: live.wabaId, accessToken: live.accessToken };
  const { getCatalogId, upsertCatalogItem, deleteCatalogItem, ensureCatalog } = await import(
    "../src/lib/whatsapp/catalog"
  );

  // (a) Catalog discovery
  let catalogId: string | null = null;
  try {
    catalogId = await getCatalogId(creds);
    console.log(`✅ (a) getCatalogId → ${catalogId ?? "null (no catalog connected to the WABA yet)"}`);
  } catch (err) {
    console.log(`❌ (a) getCatalogId failed — VERBATIM Meta error:\n    ${errText(err)}`);
  }

  // (b) Auto-creation path (only when no catalog exists)
  if (!catalogId) {
    console.log("\n▶ (b) No catalog found — trying ensureCatalog (auto-creation)…");
    try {
      const ensured = await ensureCatalog({ ...creds, name: live.name });
      console.log(
        `   ensureCatalog → catalogId=${ensured.catalogId ?? "null"} created=${ensured.created} ` +
          `connected=${ensured.connected} needsManualCreation=${ensured.needsManualCreation}` +
          (ensured.error ? `\n   VERBATIM Meta error: ${ensured.error}` : "")
      );
      catalogId = ensured.catalogId;
      if (ensured.needsManualCreation) {
        console.log(
          "   NOTE: this is the expected external gate when the app lacks the approved\n" +
            "   catalog_management / business_management permissions — until Meta approves them,\n" +
            "   the dashboard guides the owner through Commerce Manager (one-time, manual)."
        );
      }
    } catch (err) {
      console.log(`   ❌ ensureCatalog threw — VERBATIM Meta error:\n    ${errText(err)}`);
    }
  }

  // (c) Catalog item write path — one throwaway item, then delete it
  if (catalogId) {
    const testRetailerId = `assistmint-verify-${Date.now().toString(36)}`;
    try {
      const upserted = await upsertCatalogItem({
        catalogId,
        accessToken: live.accessToken,
        item: {
          retailerId: testRetailerId,
          name: "AssistMint Verify Test Item",
          description: "Temporary item created by scripts/verify-catalog-upi.mts — deleted immediately.",
          price: 100, // ₹1.00 in paise
          currency: "INR",
          availability: "IN_STOCK",
        },
      });
      console.log(`✅ (c) upsertCatalogItem → ${JSON.stringify(upserted).slice(0, 140)}`);
      try {
        const deleted = await deleteCatalogItem({
          catalogId,
          accessToken: live.accessToken,
          retailerId: testRetailerId,
        });
        console.log(`✅ (c) deleteCatalogItem → ${JSON.stringify(deleted).slice(0, 140)}`);
      } catch (err) {
        console.log(`⚠️ (c) deleteCatalogItem failed (cleanup!) — VERBATIM Meta error:\n    ${errText(err)}`);
      }
    } catch (err) {
      console.log(`❌ (c) upsertCatalogItem failed — VERBATIM Meta error:\n    ${errText(err)}`);
    }
  } else {
    console.log("\n▶ (c) Skipped item upsert/delete — no catalog id available.");
  }

  // (d) In-chat UPI config
  const upiVpa = live.businessConfig?.upi_vpa;
  console.log(
    `\nℹ️  (d) business_config.upi_vpa → ${
      typeof upiVpa === "string" && upiVpa ? upiVpa : "NOT SET (customers get a payment link instead)"
    }`
  );
  const lastSync = live.businessConfig?.last_catalog_sync_at;
  console.log(
    `ℹ️  (d) business_config.last_catalog_sync_at → ${
      typeof lastSync === "string" ? lastSync : "never"
    } (catalog_setup_needed=${live.businessConfig?.catalog_setup_needed === true})`
  );

  console.log(
    "\n=== RESULT: catalog API errors above (if any) are the documented App Review gate — expected until Meta approves the catalog permissions. ==="
  );
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
