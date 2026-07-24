-- ============================================
-- Migration: Add multi-business support
-- Adds business_type, delivery_enabled, pickup_enabled, business_config
-- ============================================

-- Business type: determines the entire platform experience
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'food_beverage';
-- Values: 'food_beverage', 'salon_spa', 'healthcare', 'education', 'retail', 'services'

-- Delivery/pickup toggles: controls checkout flow
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pickup_enabled boolean NOT NULL DEFAULT true;

-- Flexible business-specific config (slot duration for salons, specializations for healthcare, etc.)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_config jsonb DEFAULT '{}';
