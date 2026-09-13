-- ============================================
-- 010 — App-wide configuration store (2026-09-13)
-- Holds app-level config/secrets that the server
-- manages automatically (zero-manual ownership).
-- First use: the WhatsApp Flows RSA keypair —
-- one keypair per Meta app, auto-generated and
-- auto-registered (src/lib/flows/keys.ts).
--
-- SECURITY: RLS enabled with NO policies — anon
-- and authenticated roles are fully denied. Only
-- the service role (which bypasses RLS) can
-- read/write. Never add client-facing policies.
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent on re-run; no policies are ever created on purpose.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
