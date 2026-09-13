// ============================================
// AssistMint — WhatsApp catalogs & product messages
// ============================================
// Catalog discovery + item CRUD via the Commerce API, commerce settings
// (cart / catalog visibility), and the interactive product message types:
// catalog_message, product (single) and product_list (multi, max 30 items).
// Menus map 1:1 for restaurants; services work as catalog items for
// salons/clinics/coaching.

import { sanitizeWhatsAppNumber } from './client';
import { extractMessageId, graphRequest } from './shared';
import type { GraphPaged, GraphSuccess, MessageSendEnvelope, MessageTarget, PhoneNumberCredential, WabaCredential } from './types';

/** Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/catalogs-overview */
async function sendInteractive(
  options: MessageTarget & { interactive: Record<string, unknown> }
): Promise<{ message_id: string }> {
  const { phoneNumberId, accessToken, to, interactive } = options;
  const data = await graphRequest<MessageSendEnvelope>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizeWhatsAppNumber(to),
      type: 'interactive',
      interactive,
    },
  });
  return { message_id: extractMessageId(data) };
}

// ─── Commerce settings ──────────────

/** Commerce settings for a phone number (cart + catalog visibility). */
export interface CommerceSettings {
  cartEnabled: boolean | null;
  catalogVisible: boolean | null;
}

/**
 * Get commerce settings (cart_enabled, catalog_visible) for a phone number.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs
 */
export async function getCommerceSettings(options: PhoneNumberCredential): Promise<CommerceSettings> {
  const { phoneNumberId, accessToken } = options;
  const data = await graphRequest<{
    data?: { cart_enabled?: boolean; catalog_visible?: boolean }[];
    cart_enabled?: boolean;
    catalog_visible?: boolean;
  }>({
    path: `${phoneNumberId}/whatsapp_commerce_settings`,
    accessToken,
  });
  const row = data.data?.[0];
  return {
    cartEnabled: row?.cart_enabled ?? data.cart_enabled ?? null,
    catalogVisible: row?.catalog_visible ?? data.catalog_visible ?? null,
  };
}

/**
 * Set commerce settings for a phone number — enable the in-chat shopping
 * cart and make the catalog visible on the business profile.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs
 */
export async function setCommerceSettings(
  options: PhoneNumberCredential & {
    /** Enable the in-chat shopping cart. */
    cartEnabled?: boolean;
    /** Make the catalog visible on the business profile. */
    catalogVisible?: boolean;
    /** snake_case alias for cartEnabled. */
    cart_enabled?: boolean;
    /** snake_case alias for catalogVisible. */
    catalog_visible?: boolean;
  }
): Promise<GraphSuccess> {
  const { phoneNumberId, accessToken } = options;
  const cartEnabled = options.cartEnabled ?? options.cart_enabled;
  const catalogVisible = options.catalogVisible ?? options.catalog_visible;

  const body: Record<string, unknown> = {};
  if (cartEnabled !== undefined) body.cart_enabled = cartEnabled;
  if (catalogVisible !== undefined) body.catalog_visible = catalogVisible;
  return graphRequest<GraphSuccess>({
    path: `${phoneNumberId}/whatsapp_commerce_settings`,
    accessToken,
    method: 'POST',
    body,
  });
}

// ─── Catalog discovery ──────────────

/**
 * Get the catalog id connected to a WABA. Tries the documented
 * `GET /{wabaId}/catalogs` edge first and falls back to the `catalogs` field
 * form. Returns the first (primary) catalog id, or null if the WABA has no
 * catalog yet.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/catalogs-overview
 */
export async function getCatalogId(options: WabaCredential): Promise<string | null> {
  const { wabaId, accessToken } = options;

  // The documented form is the `catalogs` FIELD on the WABA node — the
  // `/{wabaId}/catalogs` edge does not exist and returns error 2500
  // "Unknown path components" (observed live).
  const field = await graphRequest<{ catalogs?: GraphPaged<{ id: string }> }>({
    path: wabaId,
    accessToken,
    query: { fields: 'catalogs' },
  });
  return field.catalogs?.data?.[0]?.id ?? null;
}

// ─── Catalog item CRUD (Commerce API) ──────────────

/**
 * Input for creating/updating a catalog item. Prices use the smallest
 * currency unit (paise for INR). Both camelCase and Graph-style snake_case
 * keys are accepted (e.g. `retailerId` / `retailer_id`).
 */
export interface CatalogItemInput {
  /** Merchant's own SKU / item id — also used as product_retailer_id in messages. */
  retailerId?: string;
  /** snake_case alias for retailerId. */
  retailer_id?: string;
  name: string;
  description?: string;
  /** Price in the currency's smallest unit (e.g. paise for INR: ₹280 → 28000). */
  price: number;
  /** ISO currency code, e.g. 'INR'. */
  currency: string;
  /** Public HTTPS link to the item image (recommended 500x500px). */
  imageUrl?: string;
  /** snake_case alias for imageUrl. */
  image_url?: string;
  /** Availability, e.g. 'IN_STOCK'/'in stock' or 'OUT_OF_STOCK'/'out of stock'. */
  availability?: string;
  /** Link to the item's page (e.g. the merchant's AssistMint ordering page). */
  url?: string;
  /** Groups items into a product group shown together. */
  retailerProductGroup?: string;
  /** snake_case alias for retailerProductGroup. */
  retailer_product_group?: string;
  brand?: string;
  category?: string;
}

function pick<T>(camel: T | undefined, snake: T | undefined): T | undefined {
  return camel !== undefined ? camel : snake;
}

/** Normalize a CatalogItemInput (either key style) into the Graph API payload — only fields that are present are included. */
function toApiItem(item: Partial<CatalogItemInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (item.name !== undefined) payload.name = item.name;
  if (item.price !== undefined) payload.price = item.price;
  if (item.currency !== undefined) payload.currency = item.currency;
  const retailerId = pick(item.retailerId, item.retailer_id);
  if (retailerId !== undefined) payload.retailer_id = retailerId;
  if (item.description !== undefined) payload.description = item.description;
  const imageUrl = pick(item.imageUrl, item.image_url);
  if (imageUrl !== undefined) payload.image_url = imageUrl;
  if (item.availability !== undefined) payload.availability = item.availability;
  if (item.url !== undefined) payload.url = item.url;
  const group = pick(item.retailerProductGroup, item.retailer_product_group);
  if (group !== undefined) payload.retailer_product_group = group;
  if (item.brand !== undefined) payload.brand = item.brand;
  if (item.category !== undefined) payload.category = item.category;
  return payload;
}

/** Result of a catalog item write. */
export interface CatalogItemWriteResult extends GraphSuccess {
  product_id?: string;
  product_retailer_id?: string;
}

/** Options for updating a catalog item. */
export interface UpdateCatalogItemOptions {
  catalogId: string;
  accessToken: string;
  /**
   * Retailer id of the item to update (recommended — the documented
   * `POST /{catalogId}/items` upsert pattern).
   */
  retailerId?: string;
  /** Catalog product id of the item (used to POST directly to /{productId}). */
  productId?: string;
  /** Alias for productId (consumer compatibility). */
  id?: string;
  /** Fields to change. Preferred over `item`. */
  changes?: Partial<CatalogItemInput>;
  /** Full item payload (alternative to changes; must carry a retailer id). */
  item?: CatalogItemInput;
}

/**
 * Create a catalog item via `POST /{catalogId}/items`. For menus, sync each
 * menu item with a stable `retailerId` so updates are idempotent.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/upload-inventory
 */
export async function createCatalogItem(
  options: { catalogId: string; accessToken: string; item: CatalogItemInput }
): Promise<CatalogItemWriteResult> {
  const { catalogId, accessToken, item } = options;
  if (item.retailerId === undefined && item.retailer_id === undefined) {
    throw new Error('createCatalogItem: item.retailerId (or retailer_id) is required');
  }
  if (item.name === undefined || item.price === undefined || item.currency === undefined) {
    throw new Error('createCatalogItem: item.name, item.price and item.currency are required');
  }
  return graphRequest<CatalogItemWriteResult>({
    path: `${catalogId}/items`,
    accessToken,
    method: 'POST',
    body: toApiItem(item),
  });
}

/**
 * Update an existing catalog item. Sends `POST /{catalogId}/items` with the
 * item's `retailer_id` plus the changed fields (Meta's documented upsert —
 * re-syncs update in place instead of duplicating). When only a catalog
 * product id is available (`productId`/`id`), the update is POSTed directly
 * to `/{productId}`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/upload-inventory
 */
export async function updateCatalogItem(options: UpdateCatalogItemOptions): Promise<CatalogItemWriteResult> {
  const { catalogId, accessToken, retailerId, productId, id, changes, item } = options;

  // Full item payloads (re-syncs) carry every field; `changes` carries only
  // the fields to update — toApiItem includes exactly what is present.
  const source: Partial<CatalogItemInput> = changes ?? item ?? {};
  const body = toApiItem(source);

  // Retailer id: explicit param wins, then the payload's own retailer id.
  const effectiveRetailerId =
    retailerId ?? pick(source.retailerId, source.retailer_id) ?? (body.retailer_id as string | undefined);
  const effectiveProductId = productId ?? id;

  if (effectiveRetailerId) {
    // Documented upsert path — POST /{catalogId}/items with retailer_id.
    return graphRequest<CatalogItemWriteResult>({
      path: `${catalogId}/items`,
      accessToken,
      method: 'POST',
      body: { ...body, retailer_id: effectiveRetailerId },
    });
  }

  if (effectiveProductId) {
    // Fall back to updating the product node directly.
    return graphRequest<CatalogItemWriteResult>({
      path: effectiveProductId,
      accessToken,
      method: 'POST',
      body,
    });
  }

  throw new Error('updateCatalogItem: provide retailerId (or an item with retailer_id) or productId');
}

/**
 * Upsert a catalog item: creates it if the `retailerId` is new, updates it
 * if it already exists (the Commerce API's POST /{catalogId}/items
 * behaviour). The recommended call for menu sync jobs.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/upload-inventory
 */
export async function upsertCatalogItem(
  options: { catalogId: string; accessToken: string; item: CatalogItemInput }
): Promise<CatalogItemWriteResult> {
  return createCatalogItem(options);
}

/**
 * Delete a catalog item by its retailer id via
 * `DELETE /{catalogId}/items?item_id={retailerId}`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/upload-inventory
 */
export async function deleteCatalogItem(
  options: { catalogId: string; accessToken: string; retailerId: string }
): Promise<GraphSuccess> {
  const { catalogId, accessToken, retailerId } = options;
  return graphRequest<GraphSuccess>({
    path: `${catalogId}/items`,
    accessToken,
    method: 'DELETE',
    query: { item_id: retailerId },
  });
}

// ─── Catalog message ──────────────

export interface SendCatalogMessageOptions extends MessageTarget {
  bodyText: string;
  footerText?: string;
  /** Thumbnail product (defaults to the first item in the catalog if omitted). */
  thumbnailProductRetailerId?: string;
}

/**
 * Send a catalog message — the native "View catalog" button that opens the
 * business's WhatsApp catalog in chat.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/sell-products-and-services/share-products
 */
export async function sendCatalogMessage(options: SendCatalogMessageOptions): Promise<{ message_id: string }> {
  const { bodyText, footerText, thumbnailProductRetailerId, ...rest } = options;

  const interactive: Record<string, unknown> = {
    type: 'catalog_message',
    body: { text: bodyText.substring(0, 1024) },
    action: {
      ...(thumbnailProductRetailerId
        ? { thumbnail: { product_retailer_id: thumbnailProductRetailerId } }
        : {}),
    },
  };
  if (footerText) interactive.footer = { text: footerText.substring(0, 60) };

  return sendInteractive({ ...rest, interactive });
}

// ─── Single product message ──────────────

export interface SendSingleProductMessageOptions extends MessageTarget {
  bodyText: string;
  footerText?: string;
  /** The item's retailer id (the `retailerId` used when syncing the catalog). */
  productRetailerId: string;
  /** Catalog id — optional when the number has exactly one connected catalog. */
  catalogId?: string;
}

/**
 * Send a single-product message (`interactive.type: "product"`) — one
 * product card with a "Buy now" / product detail sheet.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/single-product-messages
 */
export async function sendSingleProductMessage(
  options: SendSingleProductMessageOptions
): Promise<{ message_id: string }> {
  const { bodyText, footerText, productRetailerId, catalogId, ...rest } = options;

  const interactive: Record<string, unknown> = {
    type: 'product',
    body: { text: bodyText.substring(0, 1024) },
    action: {
      ...(catalogId ? { catalog_id: catalogId } : {}),
      product_retailer_id: productRetailerId,
    },
  };
  if (footerText) interactive.footer = { text: footerText.substring(0, 60) };

  return sendInteractive({ ...rest, interactive });
}

// ─── Multi-product message ──────────────

/** A titled section of products in a multi-product message. */
export interface ProductSection {
  title: string;
  productRetailerIds: string[];
}

export interface SendMultiProductMessageOptions extends MessageTarget {
  /** Header text — required for multi-product messages (max 60 chars). */
  headerText: string;
  bodyText: string;
  footerText?: string;
  catalogId?: string;
  /** Product sections — max 10 sections, max 30 products in total. */
  sections: ProductSection[];
}

const MAX_MULTI_PRODUCT_SECTIONS = 10;
const MAX_MULTI_PRODUCT_ITEMS = 30;

/**
 * Send a multi-product message (`interactive.type: "product_list"`) — up to
 * 30 products grouped into up to 10 titled sections (e.g. "Starters",
 * "Mains", "Desserts").
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/multi-product-messages
 */
export async function sendMultiProductMessage(
  options: SendMultiProductMessageOptions
): Promise<{ message_id: string }> {
  const { headerText, bodyText, footerText, catalogId, sections, ...rest } = options;

  if (sections.length === 0 || sections.length > MAX_MULTI_PRODUCT_SECTIONS) {
    throw new Error(
      `sendMultiProductMessage: expected 1-${MAX_MULTI_PRODUCT_SECTIONS} sections, got ${sections.length}`
    );
  }
  const totalProducts = sections.reduce((sum, section) => sum + section.productRetailerIds.length, 0);
  if (totalProducts === 0 || totalProducts > MAX_MULTI_PRODUCT_ITEMS) {
    throw new Error(
      `sendMultiProductMessage: expected 1-${MAX_MULTI_PRODUCT_ITEMS} products in total, got ${totalProducts}`
    );
  }

  const interactive: Record<string, unknown> = {
    type: 'product_list',
    header: { type: 'text', text: headerText.substring(0, 60) },
    body: { text: bodyText.substring(0, 1024) },
    action: {
      ...(catalogId ? { catalog_id: catalogId } : {}),
      sections: sections.map((section) => ({
        title: section.title.substring(0, 24),
        product_items: section.productRetailerIds.map((id) => ({ product_retailer_id: id })),
      })),
    },
  };
  if (footerText) interactive.footer = { text: footerText.substring(0, 60) };

  return sendInteractive({ ...rest, interactive });
}
