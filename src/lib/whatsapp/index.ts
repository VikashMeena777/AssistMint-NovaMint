// ============================================
// AssistMint — WhatsApp Cloud API barrel
// ============================================
// Everything under src/lib/whatsapp/ in one import:
//   import { sendTextMessage, markAsReadWithTyping, buildUpiIntentLink } from '@/lib/whatsapp';
//
// client.ts          — core message types (text, list, buttons, carousel, image,
//                       template, reaction, location, document) + graphUrl
// shared.ts          — graphRequest / withRetry plumbing (typed WhatsAppApiError)
// types.ts           — shared shapes & the typed error class
// indicators.ts      — mark-as-read + typing indicators
// markdown.ts        — WhatsApp-flavored markdown builders
// media.ts           — audio, sticker, location request, contacts
// links.ts           — wa.me links, QR codes / short links, local QR rendering
// business-profile.ts— business profile get/update
// analytics.ts       — WABA / conversation / pricing / template analytics + health
// catalog.ts         — catalog CRUD, commerce settings, product messages
// payments.ts        — India in-chat UPI (order_details / order_status) + webhooks
// flows.ts           — Flow sending + Flow management API
// groups.ts          — Groups API (create, invite links, group text)
// obd.ts             — Official Business Account status / request / eligibility

export * from './client';
export * from './types';
export * from './shared';
export * from './indicators';
export * from './markdown';
export * from './media';
export * from './links';
export * from './business-profile';
export * from './analytics';
export * from './catalog';
export * from './payments';
export * from './flows';
export * from './groups';
export * from './obd';
