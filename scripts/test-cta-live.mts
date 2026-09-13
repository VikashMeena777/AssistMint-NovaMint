import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await sb.from("restaurants").select("whatsapp_phone_id, whatsapp_access_token").not("whatsapp_phone_id","is",null).eq("is_active",true).limit(1).single();
const r = data as Record<string, string>;

const res = await fetch(`https://graph.facebook.com/v25.0/${r.whatsapp_phone_id}/messages`, {
  method: "POST",
  headers: { Authorization: `Bearer ${r.whatsapp_access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "917875995094",
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: "💳 *Pay Now test*\n\nTap below to pay securely via UPI/card." },
      action: {
        name: "cta_url",
        parameters: {
          display_text: "Pay ₹448",
          url: "https://payments-test.cashfree.com/links/rb0ke649mbe0_AAAAAACoDBI",
        },
      },
    },
  }),
});
const j = await res.json();
console.log(res.ok ? "✅ CTA PAY BUTTON SENT — customer receives a working Pay button" : "❌ STILL FAILING: " + JSON.stringify(j).slice(0, 250));
