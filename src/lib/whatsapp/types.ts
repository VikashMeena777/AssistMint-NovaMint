// ============================================
// AssistMint — WhatsApp Cloud API shared types
// ============================================
// Shared shapes used by every module under src/lib/whatsapp/.
// These are plain library types — no React, no server-only imports.

/** Per-restaurant credentials for phone-number-scoped Cloud API calls. */
export interface PhoneNumberCredential {
  /** WhatsApp business phone number ID (not the raw phone number). */
  phoneNumberId: string;
  /** Access token valid for the owning WABA / phone number. */
  accessToken: string;
}

/** Per-restaurant credentials for WABA-scoped Cloud API calls. */
export interface WabaCredential {
  /** WhatsApp Business Account ID. */
  wabaId: string;
  /** Access token valid for the WABA. */
  accessToken: string;
}

/** Credentials + recipient used by all message-sending functions. */
export interface MessageTarget extends PhoneNumberCredential {
  /** Customer WhatsApp number (10-digit Indian numbers get a 91 prefix automatically). */
  to: string;
}

/** Success envelope returned by the Messages endpoint. */
export interface MessageSendEnvelope {
  messaging_product?: string;
  contacts?: { input?: string; wa_id?: string }[];
  messages?: { id?: string }[];
}

/** Generic `{"success": true}` Graph API response. */
export interface GraphSuccess {
  success?: boolean;
}

/** Graph API list/paging envelope. */
export interface GraphPaged<T> {
  data?: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
}

/** Raw error payload shape returned by the Graph API on failure. */
export interface WhatsAppApiErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_data?: { messaging_product?: string; details?: string };
    fbtrace_id?: string;
  };
}

/**
 * Typed error thrown by every function in this library when the Graph API
 * returns a non-2xx response. The `message` always contains the HTTP status
 * code so the shared retry helper can classify retryable failures.
 */
export class WhatsAppApiError extends Error {
  readonly status: number;
  readonly errorCode?: number;
  readonly errorSubcode?: number;
  readonly errorType?: string;
  readonly details?: string;
  readonly fbtraceId?: string;
  /** The raw response body, for debugging and logging. */
  readonly raw: unknown;

  constructor(status: number, payload: unknown) {
    const body: WhatsAppApiErrorPayload =
      typeof payload === 'object' && payload !== null
        ? (payload as WhatsAppApiErrorPayload)
        : {};
    const error = body.error ?? {};
    super(
      `WhatsApp API error ${status}${error.code !== undefined ? ` (code ${error.code})` : ''}: ${
        error.message ?? 'Unknown error'
      }`
    );
    this.name = 'WhatsAppApiError';
    this.status = status;
    this.errorCode = error.code;
    this.errorSubcode = error.error_subcode;
    this.errorType = error.type;
    this.details = error.error_data?.details;
    this.fbtraceId = error.fbtrace_id;
    this.raw = payload;
  }
}

/** Amount object used by the India Payments API (`{ value, offset }`, offset is 100 for INR, value in paise). */
export interface PaymentAmount {
  value: number;
  offset: number;
}
