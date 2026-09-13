// ============================================
// AssistMint — Cron: WhatsApp Analytics Poll
// Nightly: pulls WABA analytics + template
// performance + phone health for every connected
// restaurant and stores them in
// whatsapp_analytics_daily for the dashboards.
// Schedule: daily 02:00 IST via cron-job.org.
// ============================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchWabaAnalytics,
  fetchConversationAnalytics,
  fetchTemplateAnalytics,
  fetchPhoneNumberHealth,
} from "@/lib/whatsapp/analytics";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  // Verify CRON_SECRET — fail closed when unset
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // All connected restaurants (both creds required for analytics)
    const { data: restaurants } = await supabaseAdmin
      .from("restaurants")
      .select("id, whatsapp_waba_id, whatsapp_phone_id, whatsapp_access_token")
      .not("whatsapp_waba_id", "is", null)
      .not("whatsapp_phone_id", "is", null)
      .not("whatsapp_access_token", "is", null)
      .eq("is_active", true);

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ message: "No connected restaurants", polled: 0 });
    }

    let polled = 0;
    let failed = 0;
    const failures: Array<{ restaurant: string; error: string }> = [];

    for (const row of restaurants) {
      const r = row as Record<string, string>;
      try {
        // Yesterday's window (IST-aligned day)
        const now = Date.now() + 5.5 * 60 * 60 * 1000;
        const day = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const start = new Date(`${day}T00:00:00+05:30`).toISOString();
        const end = new Date(`${day}T23:59:59+05:30`).toISOString();

        const creds = {
          wabaId: r.whatsapp_waba_id,
          accessToken: r.whatsapp_access_token,
        };

        // Parallel pulls — analytics, conversations, templates, health
        const [analytics, conversations, templates, health] = await Promise.allSettled([
          fetchWabaAnalytics({ ...creds, start, end }),
          fetchConversationAnalytics({ ...creds, start, end }),
          fetchTemplateAnalytics({ ...creds, start, end }),
          fetchPhoneNumberHealth({
            phoneNumberId: r.whatsapp_phone_id,
            accessToken: r.whatsapp_access_token,
          }),
        ]);

        // Store the day's row (upsert on restaurant+day)
        const analyticsData = analytics.status === "fulfilled" ? analytics.value : null;
        const convData = conversations.status === "fulfilled" ? conversations.value : null;
        const templateData = templates.status === "fulfilled" ? templates.value : null;
        const healthData = health.status === "fulfilled" ? health.value : null;

        await supabaseAdmin.from("whatsapp_analytics_daily").upsert(
          {
            restaurant_id: r.id,
            day,
            sent: analyticsData?.sent ?? 0,
            delivered: analyticsData?.delivered ?? 0,
            read_count: analyticsData?.read ?? 0,
            conversations: convData?.total ?? 0,
            conversations_by_category: convData?.byCategory ?? {},
            cost: convData?.cost ?? 0,
            template_stats: templateData?.templates ?? [],
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,day" }
        );

        // Health alerts: quality not GREEN or tier regression → activity_log alert
        if (healthData && healthData.quality_rating && healthData.quality_rating !== "GREEN" && healthData.quality_rating !== "UNKNOWN") {
          await supabaseAdmin.from("activity_log").insert({
            restaurant_id: r.id,
            actor_type: "system",
            actor_id: "cron:wa-analytics",
            action: "whatsapp.quality_alert",
            details: {
              quality_rating: healthData.quality_rating,
              messaging_limit_tier: healthData.messaging_limit_tier,
              advice: "Quality rating dropped — review recent template sends and block rates.",
            },
          });
        }

        polled++;
      } catch (err) {
        failed++;
        failures.push({
          restaurant: r.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      message: `Polled ${polled}/${restaurants.length} restaurants`,
      polled,
      failed,
      failures: failures.slice(0, 5),
    });
  } catch (error) {
    console.error("[Cron:WA Analytics] Error:", error);
    return NextResponse.json({ message: "Error processed" }, { status: 200 });
  }
}
