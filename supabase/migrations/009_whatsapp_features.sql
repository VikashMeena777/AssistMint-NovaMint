-- ============================================
-- 009 — WhatsApp platform features (2026-09-13)
-- Supports: conversation tags, analytics storage,
-- native catalog orders, in-chat payment refs.
-- Additive only.
-- ============================================

-- 1. Conversation tags (no Cloud API for tags — we implement our own)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. WhatsApp analytics storage (nightly WABA analytics poll)
CREATE TABLE IF NOT EXISTS public.whatsapp_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day date NOT NULL,
  sent bigint DEFAULT 0,
  delivered bigint DEFAULT 0,
  read_count bigint DEFAULT 0,
  conversations int DEFAULT 0,
  conversations_by_category jsonb DEFAULT '{}',
  cost numeric(12,4) DEFAULT 0,
  template_stats jsonb DEFAULT '[]',
  fetched_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, day)
);

-- 3. Native catalog order reference (orders arriving via WhatsApp cart)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS meta_order_ref text;

-- 4. In-chat payment reference (order_details / payment webhooks)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS meta_reference_id text;

-- 5. Index for order webhook dedup
CREATE UNIQUE INDEX IF NOT EXISTS orders_meta_order_ref_uniq
  ON public.orders(meta_order_ref)
  WHERE meta_order_ref IS NOT NULL;

-- RLS for the new table (match existing read policies: owner-only)
ALTER TABLE public.whatsapp_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics owner read" ON public.whatsapp_analytics_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = whatsapp_analytics_daily.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );
