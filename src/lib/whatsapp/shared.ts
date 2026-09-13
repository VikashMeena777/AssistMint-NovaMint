// ============================================
// AssistMint — WhatsApp Graph API shared client
// ============================================
// Shared request plumbing for all modules under src/lib/whatsapp/.
// Mirrors the conventions of client.ts (exponential backoff retry, typed
// errors) so every new module gets withRetry behaviour for free.

import { graphUrl } from './client';
import { WhatsAppApiError } from './types';
import type { MessageSendEnvelope } from './types';

// ─── Exponential Backoff Retry (same policy as client.ts) ──────────────

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  retryableStatusCodes?: number[];
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 200, retryableStatusCodes = [429, 500, 502, 503, 504] } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const message = lastError.message || '';

      const isRetryable =
        retryableStatusCodes.some((code) => message.includes(`${code}`)) ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('fetch failed');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 200ms → 400ms → 800ms
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[WhatsApp] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${message.substring(0, 100)}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ─── Typed Graph API request ──────────────

export interface GraphRequestOptions {
  /** Graph path after the version segment, e.g. `${phoneNumberId}/messages`. */
  path: string;
  accessToken: string;
  method?: 'GET' | 'POST' | 'DELETE';
  /** Query parameters. `undefined` values are skipped. */
  query?: Record<string, string | undefined>;
  /** JSON body. Omit for GET/DELETE requests without a body. */
  body?: Record<string, unknown>;
}

/**
 * Perform a Graph API request with retry and typed error handling.
 * Throws {@link WhatsAppApiError} on non-2xx responses.
 */
export async function graphRequest<T>(options: GraphRequestOptions): Promise<T> {
  return withRetry(async () => {
    const { path, accessToken, method = 'GET', query, body } = options;

    let url = graphUrl(path);
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, value);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new WhatsAppApiError(response.status, data);
    }

    return data as T;
  });
}

/** Extract the first message id (`wamid...`) from a Messages endpoint response. */
export function extractMessageId(data: MessageSendEnvelope): string {
  return data.messages?.[0]?.id ?? '';
}
