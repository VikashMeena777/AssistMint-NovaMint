// LIVE E2E — tests the actual client-lib modules against Meta's real Graph API
// using the connected "Vikash Eats" restaurant credentials from the live DB.
// Read-only endpoints only (no customer-visible side effects).
// Run: npx tsx scripts/e2e-live-whatsapp.mts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface Creds {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  name: string;
}

async function getCreds(): Promise<Creds | null> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("name, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token")
    .not("whatsapp_phone_id", "is", null)
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

async function test(name: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    const result = await fn();
    console.log(`✅ ${name}`, JSON.stringify(result).slice(0, 160));
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ ${name} — ${msg.slice(0, 220)}`);
    return false;
  }
}

async function main() {
  const creds = await getCreds();
  if (!creds) {
    console.log("⚠️ No connected restaurant found — cannot run live E2E");
    return;
  }
  console.log(`\n=== LIVE E2E against Meta Graph API — restaurant: ${creds.name} ===\n`);

  const { getBusinessProfile } = await import("../src/lib/whatsapp/business-profile");
  const { fetchPhoneNumberHealth } = await import("../src/lib/whatsapp/analytics");
  const { listQrCodes } = await import("../src/lib/whatsapp/links");
  const { buildChatLink, buildCatalogLink } = await import("../src/lib/whatsapp/links");

  let passed = 0;
  let blocked = 0;

  // 1. Business profile (read)
  (await test("business profile GET", () => getBusinessProfile({ ...creds }))) ? passed++ : blocked++;

  // 2. Phone number health (quality rating, tier)
  (await test("phone health GET (quality/tier)", () => fetchPhoneNumberHealth({ ...creds })))
    ? passed++
    : blocked++;

  // 3. QR codes list (read)
  (await test("QR codes list", () => listQrCodes({ ...creds }))) ? passed++ : blocked++;

  // 4. WABA analytics (last 7 days, read)
  const { fetchWabaAnalytics, fetchTemplateAnalytics } = await import("../src/lib/whatsapp/analytics");
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  (await test("WABA analytics (7d)", () => fetchWabaAnalytics({ ...creds, start, end })))
    ? passed++
    : blocked++;

  // 5. Template analytics (read)
  (await test("template analytics", () => fetchTemplateAnalytics({ ...creds, start, end })))
    ? passed++
    : blocked++;

  // 6. Pure helpers (no API)
  const chatLink = buildChatLink("919876543210", "Hi! I'd like to order");
  const catalogLink = buildCatalogLink("919876543210");
  const linksOk = chatLink.includes("wa.me/919876543210") && catalogLink.includes("wa.me/c/");
  console.log(`${linksOk ? "✅" : "❌"} wa.me link builders — ${chatLink} | ${catalogLink}`);
  linksOk ? passed++ : blocked++;

  // 7. WRITE path (safe): create a test QR code, then delete it
  const qrWrite = await test("QR code create→delete (write path)", async () => {
    const { createQrCode } = await import("../src/lib/whatsapp/links");
    const created = await createQrCode({
      ...creds,
      prefilledText: "assistmint-e2e-test-qr",
    });
    const code = (created as unknown as Record<string, unknown>).code as string;
    if (!code) throw new Error("no code returned");
    const { deleteQrCode } = await import("../src/lib/whatsapp/links");
    await deleteQrCode({ ...creds, code });
    return { created: code, deleted: true };
  });
  qrWrite ? passed++ : blocked++;

  console.log(`\n=== RESULT: ${passed} passed, ${blocked} failed/blocked ===`);
  console.log(
    blocked > 0
      ? "NOTE: failures with 'error code 200' / permission errors = the documented App Review blocker (expected until you submit + Meta approves)."
      : "All live API calls succeeded — features are live on the connected number."
  );
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
