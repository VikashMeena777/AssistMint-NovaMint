-- ============================================
-- 011 — Messaging credits (2026-09-13)
-- Prepaid message credits: client businesses buy
-- credits from AssistMint (margin over Meta's
-- per-message fees) and spend them on
-- business-initiated sends (broadcasts, win-back,
-- review requests). Customer replies inside the
-- 24h window stay FREE — no deduction there.
--
-- Wallet balance can never go negative (CHECK),
-- and spend_credits is atomic: the UPDATE only
-- matches when balance >= amount, so concurrent
-- spends cannot overdraw. All mutations flow
-- through the SECURITY DEFINER RPCs (service
-- role only); owners get read-only RLS access.
-- ============================================

-- ─── Wallets: one row per restaurant ────────

CREATE TABLE IF NOT EXISTS public.credit_wallets (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Ledger: every balance change ───────────

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL, -- purchase | campaign | broadcast | business_message | refund | bonus
  reference text,
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_restaurant
  ON public.credit_transactions(restaurant_id, created_at DESC);

-- ─── RLS: owner read-only, service role bypasses ──

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view credit wallet" ON public.credit_wallets
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view credit transactions" ON public.credit_transactions
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── RPC: spend_credits (atomic, cannot overdraw) ──

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_restaurant_id uuid,
  p_amount int,
  p_reason text,
  p_reference text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Atomic claim: only succeeds while the wallet can cover the amount
  UPDATE public.credit_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE restaurant_id = p_restaurant_id
    AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_transactions (restaurant_id, delta, reason, reference, balance_after)
  VALUES (p_restaurant_id, -p_amount, p_reason, p_reference, v_balance);

  RETURN v_balance;
END;
$$;

-- ─── RPC: add_credits (purchase / refund / bonus) ──

CREATE OR REPLACE FUNCTION public.add_credits(
  p_restaurant_id uuid,
  p_amount int,
  p_reason text,
  p_reference text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Auto-creates the wallet row on first top-up
  INSERT INTO public.credit_wallets (restaurant_id, balance)
  VALUES (p_restaurant_id, p_amount)
  ON CONFLICT (restaurant_id) DO UPDATE
    SET balance = public.credit_wallets.balance + p_amount,
        updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_transactions (restaurant_id, delta, reason, reference, balance_after)
  VALUES (p_restaurant_id, p_amount, p_reason, p_reference, v_balance);

  RETURN v_balance;
END;
$$;

-- ─── Execute grants: service role only ──────

REVOKE ALL ON FUNCTION public.spend_credits(uuid, int, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, int, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.add_credits(uuid, int, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, int, text, text) TO service_role;
