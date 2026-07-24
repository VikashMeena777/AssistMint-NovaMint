-- =============================================
-- Phase 3: Inquiry / Lead Capture
-- For Education, Healthcare, and Services
-- Applied via Supabase MCP
-- =============================================

CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  interest text NOT NULL,
  message text,
  source text DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'new',
  follow_up_notes text,
  followed_up_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_restaurant ON inquiries(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer ON inquiries(customer_id);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage inquiries" ON inquiries
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on inquiries" ON inquiries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
