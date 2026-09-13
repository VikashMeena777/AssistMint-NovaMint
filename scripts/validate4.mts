import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_waba_id, whatsapp_access_token").not("whatsapp_waba_id","is",null).limit(1).single();
const r = data as Record<string, any>;

// Hypothesis test: terminal: true on the final screen, no completion, no footer
const flowJson = {
  version: "7.3",
  data_api_version: "3.0",
  routing_model: { PICK: ["FINAL"], FINAL: [] },
  screens: [
    {
      id: "PICK",
      title: "Pick",
      data: { choice: { type: "string", __example__: "a" } },
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextHeading", text: "Pick one" },
          { type: "RadioButtonsGroup", name: "choice", label: "Choice", required: true,
            "data-source": [{ id: "a", title: "Option A" }, { id: "b", title: "Option B" }] },
          { type: "Footer", label: "Continue", "on-click-action": { name: "data_exchange", payload: {} } },
        ],
      },
    },
    {
      id: "FINAL",
      title: "Done",
      terminal: true,
      data: {},
      layout: {
        type: "SingleColumnLayout",
        children: [{ type: "TextBody", text: "All set!" }, { type: "Footer", label: "Finish", "on-click-action": { name: "complete", payload: {} } }],
      },
    },
  ],
};

const res = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_waba_id}/flows`, {
  method: "POST",
  headers: { Authorization: `Bearer ${r.whatsapp_access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Terminal Test " + Date.now(),
    categories: ["APPOINTMENT_BOOKING"],
    endpoint_uri: "https://assistmint.novamintnetworks.in/api/whatsapp/flows-endpoint",
    flow_json: JSON.stringify(flowJson),
    publish: false,
  }),
});
const j = await res.json();
if (j.id) await fetch(`https://graph.facebook.com/v25.0/${j.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${r.whatsapp_access_token}` } });
console.log("terminal:true hypothesis:", j.validation_errors?.length ? JSON.stringify(j.validation_errors).slice(0, 500) : (j.error ? "ERROR: " + j.error.message : "✅ VALID — terminal:true + no footer on final screen works"));
