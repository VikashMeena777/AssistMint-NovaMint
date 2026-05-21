// ============================================
// Health Check API — Protected
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { checkAIHealth } from '@/lib/ai/engine';
import { createClient } from '@supabase/supabase-js';

async function checkDBHealth(): Promise<{ connected: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    return { connected: !error, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: Date.now() - start };
  }
}

export async function GET(req: NextRequest) {
  // Basic auth check — allow CRON_SECRET or internal requests
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Return basic status without details for unauthenticated
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Run checks in parallel for speed
    const [aiHealth, dbHealth] = await Promise.all([
      checkAIHealth(),
      checkDBHealth(),
    ]);

    const aiOk = aiHealth.nim || aiHealth.groq;
    const overallStatus = dbHealth.connected && aiOk
      ? 'healthy'
      : dbHealth.connected
        ? 'degraded'
        : 'unhealthy';

    return NextResponse.json({
      status: overallStatus,
      database: dbHealth,
      ai: {
        available: aiOk,
        providers: aiHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
