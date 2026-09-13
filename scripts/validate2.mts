import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_waba_id, whatsapp_access_token").not("whatsapp_waba_id","is",null).limit(1).single();
const r = data as Record<string, any>;

const { buildAppointmentFlow } = await import("../src/lib/flows/definitions");
const flowJson = buildAppointmentFlow([
  { id: "s1", name: "Consultation", price: 49900 },
  { id: "s2", name: "Follow-up", price: 29900 },
]);

// Create a NEW throwaway flow with flow_json — Meta validates and returns errors verbatim
const res = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}/flows`, {
  method: "POST",
  headers: { Authorization: `Bearer ${r.whatsapp_access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Validation Probe " + Date.now(),
    categories: ["APPOINTMENT_BOOKING", "OTHER"],
    endpoint_uri: "https://assistmint.novamintnetworks.in/api/whatsapp/flows-endpoint",
    flow_json: JSON.stringify(flowJson),
    publish: false,
  }),
});
const j = await res.json();
console.log(JSON.stringify(j, null, 2).slice(0, 3000));
// cleanup: delete the probe flow
if (j.id) {
  await fetch(`https://graph.facebook.com/v25.0/${j.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } });
  console.log("(probe flow deleted)");
}
