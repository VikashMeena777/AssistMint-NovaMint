import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_waba_id, whatsapp_access_token").not("whatsapp_waba_id","is",null).limit(1).single();
const r = data as Record<string, any>;

const { buildAppointmentFlow, buildFeedbackFlow, buildAddressFlow } = await import("../src/lib/flows/definitions");
const app = buildAppointmentFlow([
  { id: "s1", name: "Consultation", price: 49900 },
  { id: "s2", name: "Follow-up", price: 29900 },
]);

async function probe(name: string, flowJson: unknown) {
  const res = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}/flows`, {
    method: "POST",
    headers: { Authorization: `Bearer ${r.whatsapp_access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Probe " + name + " " + Date.now(),
      categories: ["APPOINTMENT_BOOKING", "OTHER"],
      endpoint_uri: "https://assistmint.novamintnetworks.in/api/whatsapp/flows-endpoint",
      flow_json: JSON.stringify(flowJson),
      publish: false,
    }),
  });
  const j = await res.json();
  if (j.id) {
    await fetch(`https://graph.facebook.com/v25.0/${j.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } });
  }
  console.log(name + ":", j.validation_errors?.length ? JSON.stringify(j.validation_errors).slice(0, 800) : (j.error ? "ERROR: " + j.error.message : "✅ NO VALIDATION ERRORS"));
}

await probe("appointment", app);
await probe("feedback", buildFeedbackFlow());
await probe("address", buildAddressFlow());
