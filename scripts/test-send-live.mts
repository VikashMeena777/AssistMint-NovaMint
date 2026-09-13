// LIVE send-path test: does the bot's number still hit error 131037?
// Sends ONE test message to the owner's own number (the one they messaged from).
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("name, whatsapp_phone_id, whatsapp_access_token")
    .not("whatsapp_phone_id", "is", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data) { console.log("no connected restaurant"); return; }
  const r = data as Record<string, string>;

  // Name status first
  const health = await fetch(
    `https://graph.facebook.com/v25.0/${r.whatsapp_phone_id}?fields=verified_name,name_status,code_verification_status`,
    { headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } }
  );
  console.log("number status:", JSON.stringify(await health.json()));

  // The owner's number (from their test message wamid, base64 HBgMOTE3ODUwOTk5MDk0FQ = 917875995094)
  const to = "917875995094";
  console.log(`\nSending test message to owner's number ${to}...`);
  const res = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_phone_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${r.whatsapp_access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: "✅ AssistMint test message — your AI front desk is working!" },
    }),
  });
  const j = await res.json();
  if (res.ok) {
    console.log("✅ SEND SUCCESS — 131037 is CLEARED, the bot can reply:", JSON.stringify(j).slice(0, 120));
  } else {
    console.log("❌ SEND FAILED:", JSON.stringify(j).slice(0, 300));
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
