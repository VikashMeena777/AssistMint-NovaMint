// Diagnose error 131037: phone number display-name status via live Graph API
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

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${r.whatsapp_phone_id}?fields=verified_name,name_status,code_verification_status,quality_rating,messaging_limit_tier,account_mode`,
    { headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } }
  );
  const j = await res.json();
  console.log("Phone number status:", JSON.stringify(j, null, 2));

  // Also check the WABA's phone numbers list for review status detail
  const { data: rd } = await supabaseAdmin
    .from("restaurants")
    .select("whatsapp_waba_id")
    .eq("id", (data as Record<string, unknown>).id as string)
    .single();
  const waba = (rd as Record<string, string>)?.whatsapp_waba_id;
  if (waba) {
    const res2 = await fetch(
      `https://graph.facebook.com/v25.0/${waba}/phone_numbers?fields=verified_name,name_status,is_official_business_account`,
      { headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } }
    );
    console.log("WABA phone list:", JSON.stringify(await res2.json(), null, 2).slice(0, 600));
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
