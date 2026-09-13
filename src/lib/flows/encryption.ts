// ============================================
// AssistMint — WhatsApp Flows Endpoint Crypto
// Implements Meta's documented data-exchange
// protocol exactly (verified against the current
// "Implementing endpoint for Flows" guide,
// updated Jun 2026):
//   https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint
//
// REQUEST (POST, decrypted by us):
//   encrypted_aes_key  → RSA-OAEP-SHA256 (RSA/ECB/OAEPWithSHA-256AndMGF1Padding)
//                        encrypted with our registered 2048-bit RSA public key.
//                        Decrypt with the private key → AES key (128-bit per spec;
//                        256-bit is auto-selected if Meta sends a 32-byte key).
//   initial_vector     → the 128-bit AES-GCM IV, plain base64 (current protocol).
//                        (Legacy generations sent this field RSA-encrypted under
//                        the name `encrypted_iv`, or prepended the IV inside the
//                        flow data buffer — both are handled as fallbacks below.)
//   encrypted_flow_data → base64( ciphertext || auth_tag[16] )
//
// RESPONSE (encrypted by us):
//   AES-GCM with the SAME key and the BIT-FLIPPED IV (every byte XOR 0xFF),
//   base64( ciphertext || auth_tag[16] ), sent as text/plain.
//   All four official Meta examples (Node, Python, PHP, Go, Java) flip the IV.
//
// Error codes the endpoint may return to Meta:
//   421 — payload cannot be decrypted (client re-fetches the public key + retries)
//   432 — request signature authentication failed
//   427 — flow token no longer valid (see route.ts)
// ============================================

import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  generateKeyPairSync,
  privateDecrypt,
} from 'node:crypto';

// ─── Types ──────────────────────────────────

/** Decrypted data-exchange request payload from the WhatsApp client. */
export interface FlowEndpointRequest {
  /** Data API version, e.g. "3.0". */
  version?: string;
  /** "ping" (health check), "INIT", "BACK", "data_exchange". */
  action: string;
  /** Screen being submitted. Absent for INIT / BACK / ping. */
  screen?: string;
  /** Submitted form data for the current screen. */
  data?: Record<string, unknown>;
  /** The flow token we generated at send time. */
  flow_token?: string;
  /** JWT signature over the flow token (flows >= 7.3 / data_api_version >= 4.0 only). */
  flow_token_signature?: string;
}

export interface DecryptedFlowRequest {
  request: FlowEndpointRequest;
  /** AES key to encrypt the response with. */
  aesKey: Buffer;
  /** IV the request was decrypted with. */
  iv: Buffer;
  /**
   * True when the current protocol was used (raw `initial_vector` field):
   * the response MUST be encrypted with the bit-flipped IV.
   * Legacy protocol generations did not flip.
   */
  flipIvForResponse: boolean;
}

/** Typed crypto failure with the HTTP status the endpoint should return. */
export class FlowCryptoError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 421) {
    super(message);
    this.name = 'FlowCryptoError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ─── Constants ──────────────────────────────

/** AES-GCM auth tag length in bytes (fixed by the spec). */
const GCM_TAG_LENGTH = 16;
/** Bytes expected for a raw `initial_vector` field. */
const RAW_IV_LENGTHS = [12, 16];
/** 2048-bit RSA ciphertext block size in bytes (legacy `encrypted_iv`). */
const RSA_BLOCK_LENGTH = 256;

// ─── Helpers (pure, unit-testable) ──────────

/**
 * Decode a base64 string, accepting both the standard and the URL-safe
 * alphabets and ignoring embedded whitespace.
 */
export function decodeBase64(input: string): Buffer {
  const normalized = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

/** Normalize a PEM private key that may have arrived with literal "\n" escapes from an env var. */
export function normalizePrivateKeyPem(pem: string): string {
  const normalized = pem.replace(/\\n/g, '\n').trim();
  if (!normalized.includes('PRIVATE KEY')) {
    throw new FlowCryptoError(
      'INVALID_PRIVATE_KEY',
      'FLOWS_PRIVATE_KEY does not look like a PEM private key (expected a -----BEGIN PRIVATE KEY----- block)'
    );
  }
  return normalized;
}

/**
 * Select the AES-GCM cipher algorithm for a key length.
 * Meta currently sends a 128-bit key; 256-bit is accepted defensively.
 */
export function aesGcmAlgorithmForKey(key: Buffer): 'aes-128-gcm' | 'aes-256-gcm' {
  if (key.length === 16) return 'aes-128-gcm';
  if (key.length === 32) return 'aes-256-gcm';
  throw new FlowCryptoError(
    'INVALID_AES_KEY_LENGTH',
    `Unexpected AES key length ${key.length} bytes (expected 16 or 32)`
  );
}

/** Bit-flip an IV (each byte XOR 0xFF) — required for encrypting the response. */
export function flipIv(iv: Buffer): Buffer {
  const flipped = Buffer.allocUnsafe(iv.length);
  for (let i = 0; i < iv.length; i++) {
    flipped[i] = iv[i] ^ 0xff;
  }
  return flipped;
}

/** AES-GCM decrypt; returns null when authentication fails (wrong key/IV layout). */
function aesGcmDecrypt(
  algorithm: 'aes-128-gcm' | 'aes-256-gcm',
  key: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
  authTag: Buffer
): Buffer | null {
  try {
    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

/** Parse + narrow the decrypted JSON into a FlowEndpointRequest. */
export function parseFlowEndpointRequest(plaintext: Buffer): FlowEndpointRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext.toString('utf-8'));
  } catch {
    throw new FlowCryptoError('INVALID_JSON', 'Decrypted flow payload is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new FlowCryptoError('INVALID_JSON', 'Decrypted flow payload is not an object');
  }
  const record = parsed as Record<string, unknown>;
  const action = record.action;
  if (typeof action !== 'string' || action.length === 0) {
    throw new FlowCryptoError('INVALID_JSON', 'Decrypted flow payload is missing "action"');
  }
  const request: FlowEndpointRequest = { action };
  if (typeof record.version === 'string') request.version = record.version;
  if (typeof record.screen === 'string') request.screen = record.screen;
  if (typeof record.flow_token === 'string') request.flow_token = record.flow_token;
  if (typeof record.flow_token_signature === 'string') {
    request.flow_token_signature = record.flow_token_signature;
  }
  if (typeof record.data === 'object' && record.data !== null) {
    request.data = record.data as Record<string, unknown>;
  }
  return request;
}

// ─── Key management ─────────────────────────

/**
 * Generate the 2048-bit RSA key pair required by the Flows protocol.
 * - privateKeyPem: PKCS#8, store as FLOWS_PRIVATE_KEY (env) or
 *   restaurants.business_config.flow_private_key (backup copy).
 * - publicKeyPem: register with Meta via POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption
 *   (see src/lib/flows/publish.ts → setBusinessPublicKey) or the Meta app dashboard.
 */
export function generateFlowKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

// ─── Request decryption ─────────────────────

/**
 * Decrypt an incoming data-exchange request per Meta's documented algorithm.
 *
 * Primary path (current protocol): the IV is the base64-decoded `initial_vector`
 * field, and `encrypted_flow_data` = ciphertext || tag.
 * Fallback paths cover legacy generations: an RSA-encrypted `encrypted_iv`
 * field, and the IV being the first 16 bytes of the flow data buffer itself.
 *
 * @param encryptedAesKey    base64 RSA-OAEP-SHA256-encrypted AES key
 * @param encryptedFlowData  base64 AES-GCM ciphertext || tag
 * @param encryptedIv        base64 IV (raw in the current protocol) — pass the
 *                           `initial_vector` or legacy `encrypted_iv` field here
 * @param privateKeyPem      our RSA private key (PKCS#1 or PKCS#8 PEM)
 */
export function decryptRequest(
  encryptedAesKey: string,
  encryptedFlowData: string,
  encryptedIv: string,
  privateKeyPem: string
): DecryptedFlowRequest {
  const privateKey = createPrivateKey(normalizePrivateKeyPem(privateKeyPem));

  // 1. Decrypt the AES key (RSA/ECB/OAEPWithSHA-256AndMGF1Padding).
  let aesKey: Buffer;
  try {
    aesKey = privateDecrypt(
      {
        key: privateKey,
        padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      decodeBase64(encryptedAesKey)
    );
  } catch (error) {
    throw new FlowCryptoError(
      'AES_KEY_DECRYPT_FAILED',
      `Failed to decrypt encrypted_aes_key: ${(error as Error).message}`
    );
  }

  const algorithm = aesGcmAlgorithmForKey(aesKey);

  const flowData = decodeBase64(encryptedFlowData);
  if (flowData.length <= GCM_TAG_LENGTH) {
    throw new FlowCryptoError('FLOW_DATA_TOO_SHORT', 'encrypted_flow_data is too short');
  }
  const ciphertext = flowData.subarray(0, flowData.length - GCM_TAG_LENGTH);
  const authTag = flowData.subarray(flowData.length - GCM_TAG_LENGTH);

  const ivField = decodeBase64(encryptedIv);

  // 2. Primary: current protocol — raw IV in the `initial_vector` field.
  if (RAW_IV_LENGTHS.includes(ivField.length)) {
    const plaintext = aesGcmDecrypt(algorithm, aesKey, ivField, ciphertext, authTag);
    if (plaintext) {
      return {
        request: parseFlowEndpointRequest(plaintext),
        aesKey,
        iv: Buffer.from(ivField), // copy out of the possibly-pooled decode buffer
        flipIvForResponse: true,
      };
    }
  }

  // 3. Fallback A (legacy): the `encrypted_iv` field is RSA-encrypted.
  if (ivField.length === RSA_BLOCK_LENGTH) {
    try {
      const legacyIv = privateDecrypt(
        {
          key: privateKey,
          padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        ivField
      );
      const plaintext = aesGcmDecrypt(algorithm, aesKey, legacyIv, ciphertext, authTag);
      if (plaintext) {
        return {
          request: parseFlowEndpointRequest(plaintext),
          aesKey,
          iv: Buffer.from(legacyIv),
          flipIvForResponse: false,
        };
      }
    } catch {
      // fall through to the prepended-IV layout
    }
  }

  // 4. Fallback B (legacy): IV is the first 16 bytes of the flow data buffer.
  const prependedIv = flowData.subarray(0, 16);
  const innerCiphertext = flowData.subarray(16, flowData.length - GCM_TAG_LENGTH);
  const plaintext = aesGcmDecrypt(algorithm, aesKey, prependedIv, innerCiphertext, authTag);
  if (plaintext) {
    return {
      request: parseFlowEndpointRequest(plaintext),
      aesKey,
      iv: Buffer.from(prependedIv),
      flipIvForResponse: false,
    };
  }

  throw new FlowCryptoError(
    'DECRYPT_FAILED',
    'Could not decrypt encrypted_flow_data with any supported IV layout'
  );
}

// ─── Response encryption ────────────────────

/**
 * Encrypt an endpoint response per Meta's documented algorithm:
 * AES-GCM with the request's AES key and the bit-flipped IV (default),
 * returning base64( ciphertext || auth_tag ) to send as a text/plain body.
 *
 * Pass { flipIv: false } only when decrypting a legacy-protocol request
 * (the route wires this automatically from decryptRequest's result).
 */
export function encryptResponse(
  responseJson: unknown,
  aesKey: Buffer,
  iv: Buffer,
  options: { flipIv?: boolean } = {}
): string {
  const { flipIv: shouldFlip = true } = options;
  const algorithm = aesGcmAlgorithmForKey(aesKey);
  const responseIv = shouldFlip ? flipIv(iv) : iv;

  const cipher = createCipheriv(algorithm, aesKey, responseIv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(responseJson), 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([ciphertext, authTag]).toString('base64');
}
