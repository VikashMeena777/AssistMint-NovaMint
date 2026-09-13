// ============================================
// AssistMint — WhatsApp Flows Keypair Manager
// Zero-manual key management: the app-wide RSA
// keypair (ONE per Meta app — the encrypted
// data-exchange request does not identify the
// restaurant before decryption, so it cannot be
// per-tenant) lives in the Supabase `app_config`
// table and self-provisions on first use.
//
// Precedence:
//   1. FLOWS_PRIVATE_KEY env var — OPTIONAL override
//      (single-tenant deployments pinning a specific
//      key). The public key is derived from it.
//   2. app_config rows 'flows_private_key' /
//      'flows_public_key' (service-role only — the
//      table has RLS enabled with no policies).
//   3. Generate once via generateFlowKeyPair() and
//      INSERT; races converge on the first winner.
//
// Migration: supabase/migrations/010_app_config.sql
// ============================================

import { createPrivateKey, createPublicKey } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { generateFlowKeyPair, normalizePrivateKeyPem } from './encryption';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface FlowKeys {
  /** PKCS#8 PEM private key (what decryptRequest expects). */
  privateKeyPem: string;
  /** SPKI PEM public key (what setBusinessPublicKey registers with Meta). */
  publicKeyPem: string;
  /** Where the key came from — for diagnostics/logging. */
  source: 'env_override' | 'app_config' | 'generated';
}

/** app_config row keys holding the keypair. */
export const FLOWS_PRIVATE_KEY_ROW = 'flows_private_key';
export const FLOWS_PUBLIC_KEY_ROW = 'flows_public_key';

// ─── Helpers ────────────────────────────────

/** Derive the SPKI public key from a private key PEM (env-override / backfill path). */
function derivePublicKeyPem(privateKeyPem: string): string {
  const privateKey = createPrivateKey(normalizePrivateKeyPem(privateKeyPem));
  return createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
}

async function readConfigRow(key: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    throw new Error(
      `app_config read failed for "${key}": ${error.message} ` +
        '(has supabase/migrations/010_app_config.sql been applied?)'
    );
  }
  const value = (data as Record<string, unknown> | null)?.value;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

async function writeConfigRow(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) {
    throw new Error(`app_config write failed for "${key}": ${error.message}`);
  }
}

// ─── getOrCreateFlowKeys ────────────────────

/** Postgres unique-violation (another worker claimed the row first). */
function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key|unique constraint/i.test(error.message ?? '');
}

/**
 * Get the app-wide WhatsApp Flows keypair, generating and persisting it on
 * first use. Idempotent and race-safe: the private-key row is the identity
 * row — concurrent callers converge on the first stored key (unique-violation
 * on insert = someone else won, re-read returns their key).
 *
 * Never called from the browser — app_config is service-role only.
 */
export async function getOrCreateFlowKeys(): Promise<FlowKeys> {
  // 1. Optional env override wins (set → this deployment uses that key).
  const envKey = process.env.FLOWS_PRIVATE_KEY;
  if (envKey && envKey.trim().length > 0) {
    const privateKeyPem = normalizePrivateKeyPem(envKey);
    return { privateKeyPem, publicKeyPem: derivePublicKeyPem(privateKeyPem), source: 'env_override' };
  }

  // 2. Existing stored private key.
  let storedPrivate = await readConfigRow(FLOWS_PRIVATE_KEY_ROW);
  let source: FlowKeys['source'] = 'app_config';

  // 3. Absent → generate + claim the private row. A plain INSERT gives us
  //    ON-CONFLICT-DO-NOTHING semantics: a unique violation means a racing
  //    worker claimed it first and their key wins; anything else is a real
  //    failure.
  if (!storedPrivate) {
    const generated = generateFlowKeyPair();
    const { error: insertError } = await supabaseAdmin
      .from('app_config')
      .insert({ key: FLOWS_PRIVATE_KEY_ROW, value: generated.privateKeyPem });
    if (insertError && !isUniqueViolation(insertError)) {
      throw new Error(`Could not insert the Flows keypair into app_config: ${insertError.message}`);
    }
    if (!insertError) {
      source = 'generated';
      // We claimed the private row — publish the matching public row (upsert
      // overwrites any stale public row from an earlier partial write).
      try {
        await writeConfigRow(FLOWS_PUBLIC_KEY_ROW, generated.publicKeyPem);
      } catch (error) {
        console.warn('[FlowsKeys] Public-key write skipped (will backfill):', (error as Error).message);
      }
    }

    // Re-read — our row, or the race winner's.
    storedPrivate = await readConfigRow(FLOWS_PRIVATE_KEY_ROW);
    if (!storedPrivate) {
      throw new Error('Flows keypair missing from app_config after insert — check the table and retry');
    }
  }

  // 4. The private row is the identity — the public row must match it (a
  //    mismatched pair would register a wrong key with Meta → 421s). Backfill
  //    when missing or mismatched (best-effort; the private key alone works).
  const expectedPublic = derivePublicKeyPem(storedPrivate);
  let publicKeyPem = await readConfigRow(FLOWS_PUBLIC_KEY_ROW);
  if (publicKeyPem !== expectedPublic) {
    publicKeyPem = expectedPublic;
    try {
      await writeConfigRow(FLOWS_PUBLIC_KEY_ROW, publicKeyPem);
    } catch (error) {
      console.warn('[FlowsKeys] Public-key backfill skipped:', (error as Error).message);
    }
  }

  return { privateKeyPem: storedPrivate, publicKeyPem, source };
}
