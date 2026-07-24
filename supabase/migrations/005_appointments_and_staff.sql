-- =============================================
-- Phase 2: Salon & Spa Support
-- Appointments table + staff specialization
-- Applied via Supabase MCP
-- =============================================

-- Add specialization to existing staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialization text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  service_price integer NOT NULL DEFAULT 0,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  customer_name text,
  customer_phone text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_restaurant ON appointments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);

-- RLS for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage appointments" ON appointments
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

-- Service-role can do everything (for API/bot)
CREATE POLICY "Service role full access on appointments" ON appointments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
