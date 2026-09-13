import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_access_token, business_config, whatsapp_phone_id").not("whatsapp_phone_id","is",null).limit(1).single();
const r = data as Record<string, any>;
const flowId = r.business_config?.flow_appointment_id;
const res = await fetch(`https://graph.facebook.com/v25.0/${flowId}?fields=status,health_status`, { headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } });
const j = await res.json();
console.log("flow status:", j.status);
for (const e of j.health_status?.entities || []) {
  console.log(`\n[${e.entity_type}] can_send: ${e.can_send_message}`);
  for (const err of e.errors || []) console.log(`  error ${err.error_code}: ${err.error_description}`);
  for (const info of e.additional_info || []) console.log(`  info: ${info}`);
}
