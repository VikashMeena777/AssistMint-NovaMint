// ============================================
// AssistMint — Cron: Plan Expiry Check
// Auto-downgrades expired trials/plans to free
// Schedule: Run daily via cron-job.org
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Verify CRON_SECRET (fail-closed: reject if CRON_SECRET is not configured)
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Find all restaurants with expired plans — with retry (Supabase REST
    // intermittently gateway-times-out, which cron-job.org then surfaces as
    // its own timeout; a single retry clears the transient)
    let expired: Array<Record<string, unknown>> | null = null;
    let fetchError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from('restaurants')
        .select('id, name, plan, plan_expires_at, owner_id')
        .neq('plan', 'free')
        .not('plan_expires_at', 'is', null)
        .lt('plan_expires_at', now);
      if (!result.error) {
        expired = result.data as Array<Record<string, unknown>>;
        fetchError = null;
        break;
      }
      fetchError = result.error.message;
      console.warn(`[Cron:PlanExpiry] Fetch attempt ${attempt + 1} failed: ${fetchError} — retrying`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }

    if (fetchError) {
      console.error('[Cron:PlanExpiry] Fetch error after retries:', fetchError);
      return NextResponse.json({ error: fetchError }, { status: 200 });
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({ message: 'No expired plans', downgraded: 0 });
    }

    let downgraded = 0;

    for (const restaurant of expired) {
      const r = restaurant as Record<string, unknown>;

      // Downgrade to free
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          plan: 'free',
          plan_expires_at: null,
        })
        .eq('id', r.id);

      if (updateError) {
        console.error(`[Cron:PlanExpiry] Failed to downgrade ${r.id}:`, updateError.message);
        continue;
      }

      // Log activity
      await supabase.from('activity_log').insert({
        restaurant_id: r.id,
        actor_type: 'system',
        actor_id: 'cron:plan-expiry',
        action: 'plan.expired',
        details: { previous_plan: r.plan, new_plan: 'free', expired_at: r.plan_expires_at },
      }).then(() => {});

      downgraded++;
      console.log(`[Cron:PlanExpiry] Downgraded ${r.name} from ${r.plan} → free`);
    }

    return NextResponse.json({
      message: `Processed ${expired.length} expired plans`,
      downgraded,
    });
  } catch (err) {
    console.error('[Cron:PlanExpiry] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 200 });
  }
}
