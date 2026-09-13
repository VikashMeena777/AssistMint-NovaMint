-- ============================================
-- 008 — Audit fixes (2026-09-12)
-- Applied to live DB via MCP execute_sql on 2026-09-12.
-- Additive changes + dedupe of exact-duplicate conversation rows
-- (in-memory webhook dedup resets across serverless instances).
-- ============================================

-- 1. Remove conversations rows that log the SAME WhatsApp message twice
--    (keep the earliest row per message id)
DELETE FROM public.conversations a
USING public.conversations b
WHERE a.id <> b.id
  AND a.whatsapp_message_id IS NOT NULL
  AND a.whatsapp_message_id = b.whatsapp_message_id
  AND a.created_at > b.created_at;

-- 2. Review-request cron dedup: mark when a rating request was sent,
--    so each delivered order is asked exactly once
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- 3. Race-safe upserts:
--    customers: unique per (restaurant, phone) — getOrCreateCustomer can upsert
--    conversations: unique per whatsapp_message_id — webhook redeliveries can't
--    double-log. FULL index (not partial): PostgREST's ON CONFLICT inference
--    cannot use partial indexes; NULLs never conflict in PG unique indexes anyway.
CREATE UNIQUE INDEX IF NOT EXISTS customers_restaurant_phone_uniq
  ON public.customers(restaurant_id, phone);
DROP INDEX IF EXISTS public.conversations_whatsapp_msg_uniq_partial;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_whatsapp_msg_uniq
  ON public.conversations(whatsapp_message_id);
