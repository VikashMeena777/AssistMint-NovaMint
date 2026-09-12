// Daily Summary Cron — sends end-of-day report to all restaurant owners
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDailySummary } from '@/lib/services/owner-notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Vercel: allow up to 45s for iterating all restaurants
export const maxDuration = 45;

export async function GET(req: Request) {
  // Verify cron secret (fail-closed: reject if CRON_SECRET is not configured)
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: restaurants } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('is_active', true);

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;
    for (const r of restaurants) {
      try {
        await sendDailySummary(r.id);
        sent++;
      } catch { /* skip individual failures */ }
    }

    return NextResponse.json({ sent });
  } catch (e) {
    console.error('[DailySummary] Error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 200 });
  }
}
