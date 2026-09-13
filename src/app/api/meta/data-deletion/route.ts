// ============================================
// AssistMint — Meta App Data Deletion Callback
// Required for App Review: responds to Meta's
// data-deletion requests for the app
// (developers.facebook.com → App Settings →
// Basic → Data Deletion Callback URL).
// ============================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || "";
const DELETION_INSTRUCTIONS_URL =
  `${process.env.NEXT_PUBLIC_APP_URL || "https://assistmint.novamintnetworks.in"}/data-deletion`;

// GET — Meta calls this to fetch the deletion instructions URL
export async function GET() {
  return NextResponse.json({
    url: DELETION_INSTRUCTIONS_URL,
    confirmation_code: "assistmint-data-deletion",
  });
}

// POST — Meta sends a signed request when a user asks Meta to delete their data
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get("signed_request");

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const [encodedSig, payload] = signedRequest.split(".");
    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expectedSig = crypto.createHmac("sha256", APP_SECRET).update(payload).digest();

    if (!APP_SECRET || sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as { user_id?: string; algorithm?: string };

    // AssistMint accounts are created via email/Google (Supabase Auth), not
    // Facebook Login — so there is no user profile keyed to Meta's user_id.
    // WhatsApp customer data (phone numbers, names) belongs to each business
    // and is deleted via the dashboard or the instructions URL below.
    // We log the request for audit and confirm deletion (nothing keyed to
    // this Meta user id exists).
    console.log("[Meta Data Deletion] Confirmed no data for Meta user:", data.user_id);

    return NextResponse.json({
      url: DELETION_INSTRUCTIONS_URL,
      confirmation_code: `assistmint-${data.user_id ?? "unknown"}-deleted`,
    });
  } catch (error) {
    console.error("[Meta Data Deletion] Error:", error);
    return NextResponse.json(
      { url: DELETION_INSTRUCTIONS_URL, confirmation_code: "assistmint-data-deletion" },
      { status: 200 }
    );
  }
}
