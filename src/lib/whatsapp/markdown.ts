// ============================================
// AssistMint — WhatsApp-flavored markdown helpers
// ============================================
// WhatsApp text and body objects support a small markdown subset:
// *bold*, _italic_, ~strikethrough~ and `monospace`. Use these helpers for
// menus, price lists and confirmations so AI replies look professional.
// Note: markdown characters count toward message length limits.

/**
 * Wrap text in WhatsApp bold markers.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export function bold(text: string): string {
  return `*${text}*`;
}

/**
 * Wrap text in WhatsApp italic markers.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export function italic(text: string): string {
  return `_${text}_`;
}

/**
 * Wrap text in WhatsApp strikethrough markers.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export function strike(text: string): string {
  return `~${text}~`;
}

/**
 * Wrap text in WhatsApp monospace (inline code) markers.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages
 */
export function mono(text: string): string {
  return `\`${text}\``;
}

/**
 * Format a single menu line: `*name* — ₹price`.
 * Example: `formatPriceLine('Paneer Tikka', 280)` → `*Paneer Tikka* — ₹280`
 */
export function formatPriceLine(name: string, price: string | number): string {
  return `${bold(name)} — ₹${price}`;
}

/** One entry of a menu/price list. */
export interface MenuListItem {
  name: string;
  price: string | number;
  /** Optional short description rendered under the item line. */
  description?: string;
}

/**
 * Format a full menu/price list with bold item names and blank lines between
 * items, ready to drop into a text message body:
 *
 * ```
 * *Paneer Tikka* — ₹280
 * Smoked cottage cheese, mint chutney
 *
 * *Butter Naan* — ₹60
 * ```
 */
export function formatMenuList(items: MenuListItem[]): string {
  return items
    .map((item) => {
      const line = formatPriceLine(item.name, item.price);
      return item.description ? `${line}\n${item.description}` : line;
    })
    .join('\n\n');
}
