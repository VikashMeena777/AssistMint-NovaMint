// ============================================
// AssistMint — WhatsApp Cloud API Client
// ============================================

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface SendMessageOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
}

// ─── Send Text Message ──────────────────────

export async function sendTextMessage(
  options: SendMessageOptions & { text: string }
): Promise<{ message_id: string }> {
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
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }
  return { message_id: data.messages?.[0]?.id || '' };
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
  const { phoneNumberId, accessToken, to, headerText, bodyText, footerText, buttonText, sections } = options;

  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: bodyText },
    action: { button: buttonText, sections },
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
        to,
        type: 'interactive',
        interactive,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  return { message_id: data.messages?.[0]?.id || '' };
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
        to,
        type: 'interactive',
        interactive,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  return { message_id: data.messages?.[0]?.id || '' };
}

// ─── Send Image Message ─────────────────────

export async function sendImageMessage(
  options: SendMessageOptions & {
    imageUrl: string;
    caption?: string;
  }
): Promise<{ message_id: string }> {
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
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  return { message_id: data.messages?.[0]?.id || '' };
}

// ─── Send Template Message ──────────────────

export async function sendTemplateMessage(
  options: SendMessageOptions & {
    templateName: string;
    languageCode?: string;
    components?: unknown[];
  }
): Promise<{ message_id: string }> {
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
        to,
        type: 'template',
        template,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  return { message_id: data.messages?.[0]?.id || '' };
}

// ─── Verify Webhook Signature ───────────────

export function verifyWebhookSignature(
  body: string,
  signature: string,
  appSecret: string
): boolean {
  // Use Node.js crypto to verify HMAC-SHA256
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');
  return `sha256=${expectedSignature}` === signature;
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
