import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_phone_id, whatsapp_waba_id, whatsapp_access_token, business_config").not("whatsapp_phone_id","is",null).limit(1).single();
const r = data as Record<string, any>;
const token = r.whatsapp_access_token;
const flowId = r.business_config?.flow_appointment_id;

// Minimal fields, then add one at a time
for (const fields of ["id,name,status", "id,name,status,health_status", "id,name,status,health_status,endpoint_uri"]) {
  const res = await fetch(`https://graph.facebook.com/v25.0/${flowId}?fields=${fields}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json();
  console.log(fields, "=>", res.ok ? JSON.stringify(j).slice(0, 220) : "ERROR: " + j.error?.message);
}
