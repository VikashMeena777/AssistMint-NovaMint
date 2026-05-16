-- ============================================
-- AssistMint — Full Database Schema Migration
-- Run this on your Supabase project
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── RESTAURANTS (Tenants) ──────────────────

CREATE TABLE public.restaurants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  phone text,
  cuisine text,
  city text,
  address text,
  gst_number text,
  logo_url text,
  cover_url text,
  min_order_amount integer DEFAULT 0,
  delivery_radius_km integer DEFAULT 5,
  avg_prep_time_min integer DEFAULT 30,
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro', 'enterprise')),
  is_active boolean DEFAULT true,
  whatsapp_phone_id text,
  whatsapp_waba_id text,
  whatsapp_token text,
  cashfree_client_id text,
  cashfree_client_secret text,
  ai_persona text DEFAULT 'You are a friendly restaurant ordering assistant.',
  languages text[] DEFAULT ARRAY['en'],
  business_hours jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);

-- ─── MENU CATEGORIES ────────────────────────

CREATE TABLE public.menu_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  name_local text,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  available_from time,
  available_until time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);

-- ─── MENU ITEMS ─────────────────────────────

CREATE TABLE public.menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  name_local text,
  description text,
  description_local text,
  base_price integer NOT NULL, -- in paise (₹1 = 100 paise)
  image_url text,
  is_veg boolean DEFAULT true,
  is_bestseller boolean DEFAULT false,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  prep_time_min integer DEFAULT 15,
  calories integer,
  spice_level integer DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 5),
  allergens text[],
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);

-- ─── MENU VARIANTS (sizes, etc.) ────────────

CREATE TABLE public.menu_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- e.g., "Half", "Full", "Family"
  price integer NOT NULL, -- in paise
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_variants_item ON public.menu_variants(item_id);

-- ─── MENU ADD-ONS ───────────────────────────

CREATE TABLE public.menu_addons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0, -- in paise
  is_available boolean DEFAULT true,
  category text, -- e.g., "Extra Toppings", "Sides"
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_addons_restaurant ON public.menu_addons(restaurant_id);

-- ─── COMBO DEALS ────────────────────────────

CREATE TABLE public.combos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  combo_price integer NOT NULL, -- in paise
  original_price integer NOT NULL,
  image_url text,
  item_ids uuid[] NOT NULL,
  is_active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_combos_restaurant ON public.combos(restaurant_id);

-- ─── CUSTOMERS ──────────────────────────────

CREATE TABLE public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  name text,
  whatsapp_name text,
  email text,
  address text,
  latitude double precision,
  longitude double precision,
  is_blocked boolean DEFAULT false,
  language_preference text DEFAULT 'en',
  tags text[],
  total_orders integer DEFAULT 0,
  total_spent integer DEFAULT 0, -- in paise
  loyalty_points integer DEFAULT 0,
  loyalty_tier text DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  last_order_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

CREATE INDEX idx_customers_restaurant ON public.customers(restaurant_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- ─── ORDERS ─────────────────────────────────

CREATE TYPE order_status AS ENUM (
  'cart',
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TYPE order_type AS ENUM (
  'delivery',
  'pickup',
  'dine_in'
);

CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status order_status DEFAULT 'cart',
  order_type order_type DEFAULT 'delivery',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0, -- in paise
  tax_amount integer NOT NULL DEFAULT 0,
  delivery_fee integer DEFAULT 0,
  discount_amount integer DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  coupon_code text,
  special_instructions text,
  delivery_address text,
  estimated_prep_min integer DEFAULT 30,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  cashfree_order_id text,
  cashfree_payment_id text,
  gst_invoice_number text,
  rated_stars integer CHECK (rated_stars BETWEEN 1 AND 5),
  rated_feedback text,
  placed_at timestamptz,
  confirmed_at timestamptz,
  prepared_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_placed_at ON public.orders(placed_at);

-- ─── CONVERSATIONS ──────────────────────────

CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  is_bot_active boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  context jsonb DEFAULT '{}', -- AI memory
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_restaurant ON public.conversations(restaurant_id);
CREATE INDEX idx_conversations_phone ON public.conversations(phone);

-- ─── MESSAGES ───────────────────────────────

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent')),
  message_type text NOT NULL DEFAULT 'text',
  content text,
  whatsapp_message_id text,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- ─── COUPONS ────────────────────────────────

CREATE TABLE public.coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat', 'free_delivery', 'free_item')),
  discount_value integer NOT NULL DEFAULT 0,
  min_order_amount integer DEFAULT 0,
  max_discount_amount integer,
  free_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  usage_limit integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, code)
);

CREATE INDEX idx_coupons_restaurant ON public.coupons(restaurant_id);
CREATE INDEX idx_coupons_code ON public.coupons(code);

-- ─── LOYALTY REWARDS ────────────────────────

CREATE TABLE public.loyalty_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('discount', 'free_item', 'free_delivery')),
  reward_value integer DEFAULT 0,
  free_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_loyalty_rewards_restaurant ON public.loyalty_rewards(restaurant_id);

-- ─── CAMPAIGNS ──────────────────────────────

CREATE TABLE public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template_name text,
  message_body text NOT NULL,
  target_segment jsonb DEFAULT '{}',
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_read integer DEFAULT 0,
  total_replied integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaigns_restaurant ON public.campaigns(restaurant_id);

-- ─── STAFF ──────────────────────────────────

CREATE TABLE public.staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'kitchen', 'delivery', 'staff')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_staff_restaurant ON public.staff(restaurant_id);

-- ─── ACTIVITY LOG ───────────────────────────

CREATE TABLE public.activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  actor_type text NOT NULL,
  actor_id text,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_log_restaurant ON public.activity_log(restaurant_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);

-- ─── ROW LEVEL SECURITY ─────────────────────

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ───────────────────────────

-- Restaurant owners see only their own restaurants
CREATE POLICY "Users see own restaurants" ON public.restaurants
  FOR ALL USING (auth.uid() = owner_id);

-- All tenant-scoped tables: access only through restaurant ownership
CREATE POLICY "Access via restaurant ownership" ON public.menu_categories
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.menu_items
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.menu_variants
  FOR ALL USING (
    item_id IN (
      SELECT mi.id FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Access via restaurant ownership" ON public.menu_addons
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.combos
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.customers
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.orders
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.conversations
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.messages
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.coupons
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.loyalty_rewards
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.campaigns
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.staff
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Access via restaurant ownership" ON public.activity_log
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- ─── UPDATED_AT TRIGGER ─────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
