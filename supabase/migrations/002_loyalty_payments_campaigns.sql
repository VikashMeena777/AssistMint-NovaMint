-- ============================================
-- AssistMint — Loyalty Transactions Table
-- Tracks point earn/redeem history
-- ============================================

-- Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment', 'expiry')),
  points INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_restaurant ON public.loyalty_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_type ON public.loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_created ON public.loyalty_transactions(created_at DESC);

-- RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Restaurant owners can read their own loyalty transactions
CREATE POLICY loyalty_tx_owner_read ON public.loyalty_transactions
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- Policy: Service role can insert (used by server actions)
CREATE POLICY loyalty_tx_service_insert ON public.loyalty_transactions
  FOR INSERT
  WITH CHECK (true);

-- Add payments table if not exists
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  cashfree_order_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_link TEXT,
  payment_method TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_restaurant ON public.payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_cashfree ON public.payments(cashfree_order_id);

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_owner_read ON public.payments
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY payments_service_all ON public.payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add campaigns table if not exists
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_filters JSONB DEFAULT '{}',
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON public.campaigns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Campaigns RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_owner_all ON public.campaigns
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at') THEN
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at') THEN
    CREATE TRIGGER update_campaigns_updated_at
      BEFORE UPDATE ON public.campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
