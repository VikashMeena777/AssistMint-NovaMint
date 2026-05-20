-- Add owner_whatsapp column for WhatsApp-based order management
-- This lets restaurant owners receive order alerts and manage orders via WhatsApp replies

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_whatsapp TEXT;

-- Comment for clarity
COMMENT ON COLUMN restaurants.owner_whatsapp IS 'Owner personal WhatsApp number for receiving order notifications and managing orders via replies';
