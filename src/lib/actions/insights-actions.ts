// ============================================
// AssistMint — Insights Actions (Server)
// Dashboard analytics server actions
// ============================================

'use server';

import { generateInsights, type Insight } from '@/lib/services/insights-service';
import { getCurrentRestaurant } from '@/lib/actions/restaurant-actions';

export async function getInsights(): Promise<{ insights: Insight[]; error?: string }> {
  try {
    const restaurant = await getCurrentRestaurant();
    if (!restaurant) {
      return { insights: [], error: 'No restaurant found' };
    }
    const id = (restaurant as Record<string, string>).id;
    const insights = await generateInsights(id);
    return { insights };
  } catch (error) {
    console.error('[Insights] Error:', error);
    return { insights: [], error: 'Failed to load insights' };
  }
}
