import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("id, whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token, business_config").not("whatsapp_phone_id","is",null).limit(1).single();
const r = data as Record<string, any>;
const token = r.whatsapp_access_token;
const flowId = r.business_config?.flow_appointment_id;
console.log("flow id:", flowId);

// 1. What fields DOES the flow have? (health_status_description errored)
const flowRes = await fetch(`https://graph.facebook.com/v25.0/${flowId}?fields=id,name,status,health_status,category,endpoint_uri,has_thumbnail,preview`, { headers: { Authorization: `Bearer ${token}` } });
console.log("flow fields:", JSON.stringify(await flowRes.json()).slice(0, 400));

// 2. WABA owner (for catalog discovery)
const wabaRes = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}?fields=name,owner`, { headers: { Authorization: `Bearer ${token}` } });
const wabaJ = await wabaRes.json();
console.log("waba:", JSON.stringify(wabaJ).slice(0, 250));

// 3. If owner exists, list its catalogs
if (wabaJ.owner?.id) {
  const catRes = await fetch(`https://graph.facebook.com/v25.0/${wabaJ.owner.id}/owned_product_catalogs?fields=id,name`, { headers: { Authorization: `Bearer ${token}` } });
  console.log("owned catalogs:", JSON.stringify(await catRes.json()).slice(0, 400));
  // 4. Try connecting the first catalog to the WABA
  const catJ = await (await fetch(`https://graph.facebook.com/v25.0/${wabaJ.owner.id}/owned_product_catalogs?fields=id,name`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const first = catJ?.data?.[0];
  if (first) {
    const conn = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}/product_catalogs`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ catalog_id: first.id }),
    });
    console.log("connect catalog", first.id, "->", JSON.stringify(await conn.json()).slice(0, 250));
  }
} else {
  // Alternative: try me/businesses
  const meRes = await fetch(`https://graph.facebook.com/v25.0/me/businesses?fields=id,name`, { headers: { Authorization: `Bearer ${token}` } });
  console.log("me/businesses:", JSON.stringify(await meRes.json()).slice(0, 300));
}
// 5. Current connected catalogs on the WABA
const cur = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}?fields=catalogs`, { headers: { Authorization: `Bearer ${token}` } });
console.log("waba catalogs field:", JSON.stringify(await cur.json()).slice(0, 300));
