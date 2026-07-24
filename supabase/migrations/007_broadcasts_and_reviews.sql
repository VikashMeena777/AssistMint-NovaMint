-- =============================================
-- Phase 4: Broadcast Messaging + Google Reviews
-- Applied via Supabase MCP
-- =============================================

CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  image_url text,
  target_audience text NOT NULL DEFAULT 'all',
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_restaurant ON broadcasts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage broadcasts" ON broadcasts
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

CREATE POLICY "Service role full access on broadcasts" ON broadcasts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Google Review URL for auto review redirect
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_url text;
