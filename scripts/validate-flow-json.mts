import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_access_token, business_config").not("whatsapp_waba_id","is",null).limit(1).single();
const r = data as Record<string, any>;

const { buildAppointmentFlow } = await import("../src/lib/flows/definitions");
const flowJson = buildAppointmentFlow([
  { id: "s1", name: "Consultation", price: 49900 },
  { id: "s2", name: "Follow-up", price: 29900 },
  { id: "s3", name: "Premium session", price: 99900 },
]);

// Exact uploadFlowJson shape (with name + asset_type)
const form = new FormData();
form.append("file", new Blob([JSON.stringify(flowJson)], { type: "application/json" }), "flow.json");
form.append("name", "flow.json");
form.append("asset_type", "FLOW_JSON");
const flowId = r.business_config?.flow_appointment_id;
const res = await fetch(`https://graph.facebook.com/v25.0/${flowId}/assets`, {
  method: "POST",
  headers: { Authorization: `Bearer ${r.whatsapp_access_token}` },
  body: form,
});
const j = await res.json();
console.log("upload:", res.ok ? "OK" : JSON.stringify(j, null, 2).slice(0, 2500));
