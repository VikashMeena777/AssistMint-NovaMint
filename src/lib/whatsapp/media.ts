// ============================================
// AssistMint — WhatsApp media & extra message types
// ============================================
// Audio (voice-note replies), stickers, location requests (home-service
// dispatch / delivery address capture) and contact cards.
// Note: sendDocumentMessage already exists in client.ts and is not duplicated.

import { sanitizeWhatsAppNumber } from './client';
import { extractMessageId, graphRequest } from './shared';
import type { MessageSendEnvelope, MessageTarget } from './types';

/** Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages */
async function sendTypedMessage(
  options: MessageTarget & { payload: Record<string, unknown> }
): Promise<{ message_id: string }> {
  const { phoneNumberId, accessToken, to, payload } = options;
  const data = await graphRequest<MessageSendEnvelope>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizeWhatsAppNumber(to),
      ...payload,
    },
  });
  return { message_id: extractMessageId(data) };
}

// ─── Audio (voice notes) ──────────────

export interface SendAudioMessageOptions extends MessageTarget {
  /** Public HTTPS link to an audio file (OGG/ACC for voice notes, also MP3, MP4, AMR). */
  audioLink?: string;
  /** Media id of an audio previously uploaded to the phone number's media. */
  audioMediaId?: string;
}

/**
 * Send an audio message — renders as a playable voice note in the customer's
 * chat (Hinglish voice replies feel native to Indian customers). Provide
 * exactly one of `audioLink` or `audioMediaId`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export async function sendAudioMessage(options: SendAudioMessageOptions): Promise<{ message_id: string }> {
  const { audioLink, audioMediaId, ...rest } = options;
  if ((audioLink ? 1 : 0) + (audioMediaId ? 1 : 0) !== 1) {
    throw new Error('sendAudioMessage: provide exactly one of audioLink or audioMediaId');
  }
  return sendTypedMessage({
    ...rest,
    payload: {
      type: 'audio',
      audio: audioLink ? { link: audioLink } : { id: audioMediaId },
    },
  });
}

// ─── Stickers ──────────────

export interface SendStickerMessageOptions extends MessageTarget {
  /** Public HTTPS link to a .webp (static) or .wepb (animated) sticker. */
  stickerLink?: string;
  /** Media id of a previously uploaded sticker. */
  stickerMediaId?: string;
}

/**
 * Send a sticker message (static .webp or animated .wepb). Provide exactly
 * one of `stickerLink` or `stickerMediaId`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export async function sendStickerMessage(options: SendStickerMessageOptions): Promise<{ message_id: string }> {
  const { stickerLink, stickerMediaId, ...rest } = options;
  if ((stickerLink ? 1 : 0) + (stickerMediaId ? 1 : 0) !== 1) {
    throw new Error('sendStickerMessage: provide exactly one of stickerLink or stickerMediaId');
  }
  return sendTypedMessage({
    ...rest,
    payload: {
      type: 'sticker',
      sticker: stickerLink ? { link: stickerLink } : { id: stickerMediaId },
    },
  });
}

// ─── Location request ──────────────

export interface SendLocationRequestMessageOptions extends MessageTarget {
  /** Body text asking the customer to share their location (max 1024 chars). */
  bodyText: string;
  /** Optional customization of the "send location" button. */
  button?: {
    /** Button label (e.g. "Send location"). */
    text?: string;
    /** Hex color, e.g. "#000000". */
    backgroundColor?: string;
  };
}

/**
 * Send a location request message (`interactive.type: "location_request_message"`)
 * — asks the customer to share their live location. Use for home-service
 * dispatch and delivery address capture.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export async function sendLocationRequestMessage(
  options: SendLocationRequestMessageOptions
): Promise<{ message_id: string }> {
  const { bodyText, button, ...rest } = options;

  const action: Record<string, unknown> = { name: 'send_location' };
  if (button) {
    action.parameters = {
      type: 'button',
      ...(button.text ? { text: button.text } : {}),
      ...(button.backgroundColor ? { background_color: button.backgroundColor } : {}),
    };
  }

  return sendTypedMessage({
    ...rest,
    payload: {
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: bodyText.substring(0, 1024) },
        action,
      },
    },
  });
}

// ─── Contacts ──────────────

/** Physical address entry on a contact card. */
export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  countryCode?: string;
  type?: string;
}

/** A contact card as defined by the Contacts message type. */
export interface WhatsAppContact {
  name: {
    formattedName: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    prefix?: string;
    suffix?: string;
  };
  birthday?: string;
  phones?: { phone: string; type?: string; waId?: string }[];
  emails?: { email: string; type?: string }[];
  urls?: { url: string; type?: string }[];
  addresses?: ContactAddress[];
  org?: { company?: string; department?: string; title?: string };
}

export interface SendContactMessageOptions extends MessageTarget {
  /** Contact cards to send (1-10). */
  contacts: WhatsAppContact[];
}

/**
 * Send one or more contact cards (e.g. share the shop manager's number with
 * a customer, or the delivery partner's number once a job is dispatched).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export async function sendContactMessage(options: SendContactMessageOptions): Promise<{ message_id: string }> {
  const { contacts, ...rest } = options;
  if (contacts.length === 0 || contacts.length > 10) {
    throw new Error(`sendContactMessage: expected 1-10 contacts, got ${contacts.length}`);
  }

  const payloadContacts = contacts.map((contact) => ({
    name: {
      formatted_name: contact.name.formattedName,
      ...(contact.name.firstName !== undefined ? { first_name: contact.name.firstName } : {}),
      ...(contact.name.lastName !== undefined ? { last_name: contact.name.lastName } : {}),
      ...(contact.name.middleName !== undefined ? { middle_name: contact.name.middleName } : {}),
      ...(contact.name.prefix !== undefined ? { prefix: contact.name.prefix } : {}),
      ...(contact.name.suffix !== undefined ? { suffix: contact.name.suffix } : {}),
    },
    ...(contact.birthday !== undefined ? { birthday: contact.birthday } : {}),
    ...(contact.phones
      ? {
          phones: contact.phones.map((p) => ({
            phone: p.phone,
            ...(p.type !== undefined ? { type: p.type } : {}),
            ...(p.waId !== undefined ? { wa_id: p.waId } : {}),
          })),
        }
      : {}),
    ...(contact.emails
      ? {
          emails: contact.emails.map((e) => ({
            email: e.email,
            ...(e.type !== undefined ? { type: e.type } : {}),
          })),
        }
      : {}),
    ...(contact.urls
      ? {
          urls: contact.urls.map((u) => ({
            url: u.url,
            ...(u.type !== undefined ? { type: u.type } : {}),
          })),
        }
      : {}),
    ...(contact.addresses
      ? {
          addresses: contact.addresses.map((a) => ({
            ...(a.street !== undefined ? { street: a.street } : {}),
            ...(a.city !== undefined ? { city: a.city } : {}),
            ...(a.state !== undefined ? { state: a.state } : {}),
            ...(a.zip !== undefined ? { zip: a.zip } : {}),
            ...(a.country !== undefined ? { country: a.country } : {}),
            ...(a.countryCode !== undefined ? { country_code: a.countryCode } : {}),
            ...(a.type !== undefined ? { type: a.type } : {}),
          })),
        }
      : {}),
    ...(contact.org
      ? {
          org: {
            ...(contact.org.company !== undefined ? { company: contact.org.company } : {}),
            ...(contact.org.department !== undefined ? { department: contact.org.department } : {}),
            ...(contact.org.title !== undefined ? { title: contact.org.title } : {}),
          },
        }
      : {}),
  }));

  return sendTypedMessage({
    ...rest,
    payload: {
      type: 'contacts',
      contacts: payloadContacts,
    },
  });
}
