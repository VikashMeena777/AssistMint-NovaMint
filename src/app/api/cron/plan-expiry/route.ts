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
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Find all restaurants with expired plans
    const { data: expired, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, name, plan, plan_expires_at, owner_id')
      .neq('plan', 'free')
      .not('plan_expires_at', 'is', null)
      .lt('plan_expires_at', now);

    if (fetchError) {
      console.error('[Cron:PlanExpiry] Fetch error:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 200 });
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
