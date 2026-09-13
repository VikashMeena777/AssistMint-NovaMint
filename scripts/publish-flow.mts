import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_access_token, business_config").not("whatsapp_waba_id","is",null).limit(1).single();
const r = data as Record<string, any>;
const flowId = r.business_config?.flow_appointment_id;
const token = r.whatsapp_access_token;

// Publish
const pub = await fetch(`https://graph.facebook.com/v25.0/${flowId}/publish`, {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}",
});
const pubJ = await pub.json();
console.log("publish:", pub.ok ? "ACCEPTED" : JSON.stringify(pubJ).slice(0, 300));

// Poll status a few times
for (let i = 0; i < 5; i++) {
  await new Promise(res => setTimeout(res, 3000));
  const st = await fetch(`https://graph.facebook.com/v25.0/${flowId}?fields=status,health_status`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await st.json();
  const flowEntity = (j.health_status?.entities || []).find((e: any) => e.entity_type === "FLOW");
  console.log(`poll ${i + 1}: status=${j.status}${flowEntity?.errors?.length ? " | flow errors: " + flowEntity.errors.map((e: any) => e.error_description).join("; ").slice(0, 150) : " | flow health: no errors"}`);
  if (j.status === "PUBLISHED") break;
}
