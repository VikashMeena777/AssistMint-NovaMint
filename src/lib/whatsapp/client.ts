// ============================================
// AssistMint — WhatsApp Cloud API Client
// ============================================

const WHATSAPP_API_URL = 'https://graph.facebook.com/v25.0';

export function sanitizeWhatsAppNumber(phone: string): string {
  let clean = phone.trim().replace(/\D/g, ''); // Keep only digits
  if (clean.length === 10) {
    clean = '91' + clean; // Default to India prefix if 10 digits
  }
  return clean;
}

// ─── Exponential Backoff Retry ──────────────

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  retryableStatusCodes?: number[];
}

async function withRetry<T>(
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

      // Check if error is retryable (rate limit or server error)
      const isRetryable = retryableStatusCodes.some(code => message.includes(`${code}`)) ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('fetch failed');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 200ms → 400ms → 800ms
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[WhatsApp] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${message.substring(0, 100)}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

interface SendMessageOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
}

// ─── Send Text Message ──────────────────────

export async function sendTextMessage(
  options: SendMessageOptions & { text: string }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, text } = options;
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'text',
          text: { preview_url: true, body: text },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    }
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Interactive List ──────────────────

export interface ListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

export async function sendListMessage(
  options: SendMessageOptions & {
    headerText?: string;
    bodyText: string;
    footerText?: string;
    buttonText: string;
    sections: ListSection[];
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, headerText, bodyText, footerText, buttonText, sections } = options;

    // Clean up sections and apply WhatsApp character limits
    const sanitizedSections = sections.map((sec) => ({
      title: sec.title.substring(0, 24),
      rows: sec.rows.map((row) => ({
        id: row.id,
        title: row.title.substring(0, 24),
        description: row.description ? row.description.substring(0, 72) : undefined,
      })),
    }));

    const interactive: Record<string, unknown> = {
      type: 'list',
      body: { text: bodyText },
      action: { 
        button: buttonText.substring(0, 20), 
        sections: sanitizedSections 
      },
    };
    if (headerText) interactive.header = { type: 'text', text: headerText.substring(0, 60) };
    if (footerText) interactive.footer = { text: footerText.substring(0, 60) };

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'interactive',
          interactive,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Reply Buttons ─────────────────────

export async function sendReplyButtons(
  options: SendMessageOptions & {
    headerText?: string;
    bodyText: string;
    footerText?: string;
    buttons: { id: string; title: string }[];
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, headerText, bodyText, footerText, buttons } = options;

    const interactive: Record<string, unknown> = {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.substring(0, 20) },
        })),
      },
    };
    if (headerText) interactive.header = { type: 'text', text: headerText };
    if (footerText) interactive.footer = { text: footerText };

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'interactive',
          interactive,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Carousel Message ──────────────────

export interface CarouselCard {
  imageUrl: string;
  body: string;
  buttons: { id: string; title: string }[];
}

export async function sendCarouselMessage(
  options: SendMessageOptions & {
    bodyText: string;
    cards: CarouselCard[];
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, bodyText, cards } = options;

    // WhatsApp requires 2-10 cards, all with same button count & header type
    if (cards.length < 2 || cards.length > 10) {
      throw new Error(`Carousel requires 2-10 cards, got ${cards.length}`);
    }

    // Normalize button count across all cards (WhatsApp requires consistency)
    const maxButtons = Math.min(2, Math.max(...cards.map(c => c.buttons.length)));

    const carouselCards = cards.map((card, idx) => ({
      card_index: idx,
      type: 'button' as const,
      header: {
        type: 'image' as const,
        image: { link: card.imageUrl },
      },
      body: { text: card.body.substring(0, 160) },
      action: {
        buttons: card.buttons.slice(0, maxButtons).map(b => ({
          type: 'quick_reply' as const,
          quick_reply: { id: b.id, title: b.title.substring(0, 20) },
        })),
      },
    }));

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'interactive',
          interactive: {
            type: 'carousel',
            body: { text: bodyText },
            action: { cards: carouselCards },
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Image Message ─────────────────────

export async function sendImageMessage(
  options: SendMessageOptions & {
    imageUrl: string;
    caption?: string;
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, imageUrl, caption } = options;

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'image',
          image: { link: imageUrl, caption },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Template Message ──────────────────

export async function sendTemplateMessage(
  options: SendMessageOptions & {
    templateName: string;
    languageCode?: string;
    components?: unknown[];
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, templateName, languageCode = 'en', components } = options;

    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };
    if (components) template.components = components;

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'template',
          template,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Reaction to a Message ─────────────

export async function sendReactionMessage(
  options: SendMessageOptions & {
    messageId: string;
    emoji: string; // e.g. '\u2705' for ✅, '\uD83D\uDE4F' for 🙏, or '' to remove
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, messageId, emoji } = options;
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'reaction',
          reaction: { message_id: messageId, emoji },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Send Location Message ──────────────────

export async function sendLocationMessage(
  options: SendMessageOptions & {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, latitude, longitude, name, address } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locationPayload: Record<string, any> = { latitude, longitude };
    if (name) locationPayload.name = name;
    if (address) locationPayload.address = address;

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'location',
          location: locationPayload,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    return { message_id: data.messages?.[0]?.id || '' };
  });
}

// ─── Mark Message as Read ───────────────────

export async function markAsRead(
  options: SendMessageOptions & { messageId: string }
): Promise<void> {
  const { phoneNumberId, accessToken, messageId } = options;
  await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

// ─── Send Document Message ──────────────────

export async function sendDocumentMessage(
  options: SendMessageOptions & {
    documentUrl: string;
    filename: string;
    caption?: string;
  }
): Promise<{ message_id: string }> {
  return withRetry(async () => {
    const { phoneNumberId, accessToken, to, documentUrl, filename, caption } = options;
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizeWhatsAppNumber(to),
          type: 'document',
          document: {
            link: documentUrl,
            filename,
            caption: caption || '',
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { message_id: (data as any)?.messages?.[0]?.id || '' };
  });
}
