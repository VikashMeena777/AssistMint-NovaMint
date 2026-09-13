// SMOKE — verifies the zero-manual WhatsApp Flows provisioning against the
// LIVE database + Meta Graph API, using .env.local credentials (same pattern
// as scripts/e2e-live-whatsapp.mts).
//
//   1. getOrCreateFlowKeys() twice — asserts the same keypair is returned
//      (idempotency: first call generates + stores in app_config, second
//      reads it back).
//   2. ensureFlowsProvisioned(restaurant.id) against the LIVE restaurant —
//      prints the per-step report. Meta permission errors on flow creation
//      are EXPECTED until App Review grants Advanced Access (known external
//      gate) — they are reported verbatim.
//
// Run: npx tsx scripts/verify-flows-provisioning.mts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function getLiveRestaurant(): Promise<{ id: string; name: string } | null> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token")
    .not("whatsapp_phone_id", "is", null)
    .not("whatsapp_access_token", "is", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, string>;
  return { id: r.id, name: r.name };
}

async function main() {
  console.log("=== Flows auto-provisioning smoke (LIVE) ===\n");

  // ── 1. Keypair idempotency ──
  const { getOrCreateFlowKeys } = await import("../src/lib/flows/keys");

  const first = await getOrCreateFlowKeys();
  console.log(
    `keypair call 1: source=${first.source}, private ${first.privateKeyPem.split("\n")[1]?.slice(0, 24)}…, public ok=${first.publicKeyPem.includes("BEGIN PUBLIC KEY")}`
  );

  const second = await getOrCreateFlowKeys();
  console.log(
    `keypair call 2: source=${second.source}, private ${second.privateKeyPem.split("\n")[1]?.slice(0, 24)}…`
  );

  const sameKey = first.privateKeyPem === second.privateKeyPem && first.publicKeyPem === second.publicKeyPem;
  console.log(sameKey ? "✅ getOrCreateFlowKeys is idempotent (same keypair both calls)" : "❌ KEY MISMATCH between calls");
  if (!sameKey) process.exit(1);

  // Verify the stored rows in app_config
  const { data: rows } = await supabaseAdmin.from("app_config").select("key").order("key");
  console.log(
    `app_config rows: ${((rows ?? []) as Record<string, string>[]).map((r) => r.key).join(", ")}`
  );

  // ── 2. Full provisioning against the LIVE restaurant ──
  const restaurant = await getLiveRestaurant();
  if (!restaurant) {
    console.log("\n⚠️ No connected restaurant found — skipped ensureFlowsProvisioned");
    return;
  }
  console.log(`\n=== ensureFlowsProvisioned — restaurant: ${restaurant.name} (${restaurant.id}) ===\n`);

  const { ensureFlowsProvisioned } = await import("../src/lib/flows/auto-setup");
  const report = await ensureFlowsProvisioned(restaurant.id);

  console.log("PROVISION REPORT:");
  console.log(JSON.stringify(report, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(`keypair ready:        ${report.keysReady ? "✅" : "❌"}`);
  console.log(`public key registered: ${report.publicKey ? "✅" : "❌"}`);
  console.log(`flow created:         ${report.flowCreated ? "✅ (created this run)" : report.flowId ? "♻️  (reused/known)" : "❌"}`);
  console.log(`published:            ${report.published ? `✅ (${report.flowStatus})` : `❌ (${report.flowStatus ?? "no status"})`}`);
  if (report.errors.length > 0) {
    console.log("\nErrors (verbatim — Meta permission errors on flow creation are the known App Review gate):");
    for (const err of report.errors) console.log(`  • ${err}`);
  } else {
    console.log("no errors — fully provisioned");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
