// ============================================
// Health Check API — Protected
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { checkAIHealth } from '@/lib/ai/engine';

export async function GET(req: NextRequest) {
  // Basic auth check — allow CRON_SECRET or internal requests
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Return basic status without provider details for unauthenticated
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const health = await checkAIHealth();
    return NextResponse.json({
      status: health.nim || health.groq ? 'healthy' : 'degraded',
      providers: health,
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
