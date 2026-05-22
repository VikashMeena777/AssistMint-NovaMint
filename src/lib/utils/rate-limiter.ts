// ============================================
// AssistMint — Rate Limiter (Upstash Redis)
// ============================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis — only if valid URL is provided (not "NA" or empty)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const isRedisConfigured = redisUrl.startsWith('https://') && redisToken.length > 0;

const redis = isRedisConfigured
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// ─── Rate Limiters ──────────────────────────

// WhatsApp webhook — 60 requests per minute per phone
export const webhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'rl:webhook',
    })
  : null;

// AI generation — 40 requests per minute (matches NIM free tier)
export const aiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(40, '1 m'),
      prefix: 'rl:ai',
    })
  : null;

// API routes — 100 requests per minute per user
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix: 'rl:api',
    })
  : null;

// Auth — 5 attempts per 15 minutes per IP
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'rl:auth',
    })
  : null;

// ─── Check Rate Limit ───────────────────────

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!limiter) {
    // If Redis not configured, allow all requests (dev mode)
    return { success: true, remaining: 999, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// ─── Redis Cache Helpers ────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  expirySeconds: number = 300
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: expirySeconds });
  } catch {
    // Silently fail — cache is non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Silently fail
  }
}

export { redis };
