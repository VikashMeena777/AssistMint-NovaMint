// ============================================
// AssistMint — WhatsApp read receipts & typing indicators
// ============================================
// Fire these while the AI "thinks" so the customer sees blue ticks and the
// classic "typing…" bubble. The typing indicator rides along in the same
// mark-as-read call per the docs.

import { graphRequest } from './shared';
import type { GraphSuccess, MessageSendEnvelope, PhoneNumberCredential } from './types';

/** The typing indicator auto-dismisses after 25 seconds (or when you send a message). */
export const TYPING_INDICATOR_DISMISS_MS = 25_000;

/** Safe re-fire interval that keeps the bubble alive during long generations. */
const TYPING_REFRESH_INTERVAL_MS = 20_000;

export interface MarkAsReadOptions extends PhoneNumberCredential {
  /** The `wamid...` id of the incoming customer message. */
  messageId: string;
}

/**
 * Mark an incoming message as read (blue ticks). Also marks earlier thread
 * messages as read. Must be sent within 30 days of the message.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read
 */
export async function markAsRead(options: MarkAsReadOptions): Promise<void> {
  const { phoneNumberId, accessToken, messageId } = options;
  await graphRequest<MessageSendEnvelope | GraphSuccess>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
  });
}

/**
 * Mark an incoming message as read AND show the "typing…" indicator.
 * The indicator auto-dismisses after 25 seconds or when you send your reply.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
 */
export async function markAsReadWithTyping(options: MarkAsReadOptions): Promise<void> {
  const { phoneNumberId, accessToken, messageId } = options;
  await graphRequest<MessageSendEnvelope | GraphSuccess>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: { type: 'text' },
    },
  });
}

/**
 * Alias for {@link markAsReadWithTyping} (kept for callers that use the
 * longer name).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
 */
export const markMessageReadAndType = markAsReadWithTyping;

/**
 * (Re-)fire the typing indicator for an already-read message. Call this again
 * every ~20 seconds during long LLM generations because the indicator
 * auto-dismisses after 25 seconds.
 *
 * This sends the same read-status call with `typing_indicator` attached
 * (re-marking an already-read message is a no-op for the read receipt).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
 */
export async function sendTypingIndicator(options: MarkAsReadOptions): Promise<void> {
  return markAsReadWithTyping(options);
}

/** Handle returned by {@link maintainTypingIndicator}. Call `stop()` when the reply is ready to send. */
export interface TypingIndicatorHandle {
  /** Stop refreshing the indicator (call right before sending the reply). */
  stop(): void;
}

/**
 * Convenience wrapper that keeps the typing indicator alive during long
 * generations: fires immediately and re-fires every 20 seconds until
 * `stop()` is called. Errors on refresh are logged and swallowed (a dropped
 * indicator must never break the reply flow).
 *
 * Only use in long-running Node contexts (not serverless functions with
 * short timeouts).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators
 */
export function maintainTypingIndicator(options: MarkAsReadOptions): TypingIndicatorHandle {
  let stopped = false;

  const fire = (): void => {
    if (stopped) return;
    sendTypingIndicator(options).catch((error: unknown) => {
      console.warn('[WhatsApp] typing indicator refresh failed:', (error as Error).message);
    });
  };

  fire();
  const timer = setInterval(fire, TYPING_REFRESH_INTERVAL_MS);

  return {
    stop(): void {
      stopped = true;
      clearInterval(timer);
    },
  };
}
