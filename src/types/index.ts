// ============================================
// AssistMint — TypeScript Type Definitions
// ============================================

// ─── Restaurant / Tenant ────────────────────
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp_phone_id: string | null;
  whatsapp_waba_id: string | null;
  whatsapp_access_token: string | null;
  description: string | null;
  cuisine_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: BusinessHours;
  delivery_zones: DeliveryZone[];
  delivery_fee_rules: DeliveryFeeRules;
  min_order_amount: number;
  currency: string;
  language: string;
  supported_languages: string[];
  ai_persona: string | null;
  gst_number: string | null;
  tax_rate: number;
  tax_inclusive_pricing: boolean;
  plan: PlanTier;
  plan_expires_at: string | null;
  cashfree_vendor_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PlanTier = 'free' | 'starter' | 'growth' | 'enterprise';

export interface BusinessHours {
  [day: string]: { open: string; close: string; is_closed?: boolean };
}

export interface DeliveryZone {
  name: string;
  pincode: string;
  fee: number;
  min_order: number;
  estimated_minutes: number;
}

export interface DeliveryFeeRules {
  base_fee?: number;
  free_delivery_above?: number;
  per_km_rate?: number;
}

// ─── Menu ───────────────────────────────────
export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  translations: Record<string, string>;
  description: string | null;
  image_url: string | null;
  display_order: number;
  available_from: string | null;
  available_to: string | null;
  available_days: number[] | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  translations: Record<string, string>;
  description: string | null;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  customizations: Customization[];
  allergens: string[];
  dietary_labels: string[];
  prep_time_minutes: number;
  calories: number | null;
  display_order: number;
  variants?: MenuItemVariant[];
  addons?: MenuItemAddon[];
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  variant_group: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  display_order: number;
  is_available: boolean;
}

export interface MenuItemAddon {
  id: string;
  menu_item_id: string;
  addon_group: string;
  name: string;
  price: number;
  is_required: boolean;
  max_selections: number | null;
  display_order: number;
  is_available: boolean;
}

export interface Customization {
  name: string;
  options: { label: string; price_adjustment?: number }[];
  required?: boolean;
  max_selections?: number;
}

// ─── Combo / Meal Deal ──────────────────────
export interface Combo {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  combo_items: ComboItem[];
  original_price: number;
  combo_price: number;
  valid_from: string | null;
  valid_until: string | null;
  available_times: { start: string; end: string } | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface ComboItem {
  item_id: string;
  item_name: string;
  quantity: number;
  variant_id?: string;
}

// ─── Customer ───────────────────────────────
export interface Customer {
  id: string;
  restaurant_id: string;
  phone: string;
  whatsapp_name: string | null;
  saved_name: string | null;
  email: string | null;
  delivery_addresses: DeliveryAddress[];
  preferred_language: string;
  dietary_preferences: string[];
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  tags: string[];
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface DeliveryAddress {
  label: string;
  full_address: string;
  pincode: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

// ─── Cart ───────────────────────────────────
export interface CartSession {
  id: string;
  restaurant_id: string;
  customer_id: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  delivery_type: DeliveryType;
  scheduled_for: string | null;
  status: CartStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export type CartStatus = 'active' | 'converted' | 'abandoned';
export type DeliveryType = 'delivery' | 'pickup' | 'dine_in';

export interface CartItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant?: { id: string; name: string; group: string; adjustment: number };
  addons?: { id: string; name: string; price: number }[];
  notes?: string;
}

// ─── Order ──────────────────────────────────
export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_number: number;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  tax_breakdown: TaxBreakdown;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_link: string | null;
  payment_id: string | null;
  cashfree_order_id: string | null;
  delivery_address: DeliveryAddress | null;
  delivery_type: DeliveryType;
  table_number: string | null;
  notes: string | null;
  scheduled_for: string | null;
  schedule_status: ScheduleStatus;
  estimated_prep_minutes: number | null;
  assigned_driver: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  feedback_rating: number | null;
  feedback_text: string | null;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';
export type ScheduleStatus = 'immediate' | 'scheduled' | 'activated';

export interface TaxBreakdown {
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  rate?: number;
}

// ─── Coupon ─────────────────────────────────
export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  max_uses_per_customer: number;
  valid_from: string;
  valid_until: string | null;
  first_order_only: boolean;
  applicable_items: string[] | null;
  applicable_categories: string[] | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export type DiscountType = 'percent' | 'flat' | 'free_delivery' | 'free_item';

// ─── Conversation ───────────────────────────
export interface Conversation {
  id: string;
  restaurant_id: string;
  customer_id: string;
  customer_phone: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: MessageType;
  whatsapp_message_id: string | null;
  requires_human: boolean;
  handed_off_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type MessageType = 'text' | 'image' | 'voice' | 'interactive' | 'location' | 'document';

// ─── Campaign ───────────────────────────────
export interface Campaign {
  id: string;
  restaurant_id: string;
  name: string;
  template_name: string | null;
  template_params: Record<string, unknown>;
  message_body: string | null;
  target_segment: string | null;
  target_count: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  status: CampaignStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed';

// ─── Loyalty Reward ─────────────────────────
export interface Reward {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: RewardType;
  reward_value: number | null;
  reward_item_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type RewardType = 'discount_percent' | 'discount_flat' | 'free_item';

// ─── Staff ──────────────────────────────────
export interface Staff {
  id: string;
  restaurant_id: string;
  user_id: string;
  name: string;
  phone: string | null;
  role: StaffRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

export type StaffRole = 'owner' | 'manager' | 'kitchen' | 'delivery' | 'staff';

// ─── Activity Log ───────────────────────────
export interface ActivityLog {
  id: string;
  restaurant_id: string;
  actor_type: 'system' | 'owner' | 'staff' | 'customer' | 'bot';
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── WhatsApp Types ─────────────────────────
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type: string };
  audio?: { id: string; mime_type: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

// ─── Plan Limits ────────────────────────────
export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  free: {
    conversations_per_month: 100,
    ai_enabled: false,
    ordering_enabled: false,
    payments_enabled: false,
    campaigns_enabled: false,
    loyalty_enabled: false,
    voice_ordering: false,
    scheduled_ordering: false,
    coupons_enabled: false,
    combos_enabled: false,
    whatsapp_flows: false,
    multi_branch: false,
    staff_roles: false,
    kds_enabled: false,
    api_access: false,
    white_label: false,
    max_menu_items: 50,
    max_staff: 1,
    branding: true,
    languages: ['en'],
  },
  starter: {
    conversations_per_month: 1000,
    ai_enabled: true,
    ordering_enabled: true,
    payments_enabled: false,
    campaigns_enabled: false,
    loyalty_enabled: false,
    voice_ordering: false,
    scheduled_ordering: true,
    coupons_enabled: true,
    combos_enabled: false,
    whatsapp_flows: false,
    multi_branch: false,
    staff_roles: false,
    kds_enabled: false,
    api_access: false,
    white_label: false,
    max_menu_items: 200,
    max_staff: 3,
    branding: false,
    languages: ['en', 'hi'],
  },
  growth: {
    conversations_per_month: -1, // unlimited
    ai_enabled: true,
    ordering_enabled: true,
    payments_enabled: true,
    campaigns_enabled: true,
    loyalty_enabled: true,
    voice_ordering: true,
    scheduled_ordering: true,
    coupons_enabled: true,
    combos_enabled: true,
    whatsapp_flows: true,
    multi_branch: false,
    staff_roles: false,
    kds_enabled: false,
    api_access: false,
    white_label: false,
    max_menu_items: -1,
    max_staff: 10,
    branding: false,
    languages: ['en', 'hi', 'ta', 'te', 'mr', 'bn', 'kn'],
  },
  enterprise: {
    conversations_per_month: -1,
    ai_enabled: true,
    ordering_enabled: true,
    payments_enabled: true,
    campaigns_enabled: true,
    loyalty_enabled: true,
    voice_ordering: true,
    scheduled_ordering: true,
    coupons_enabled: true,
    combos_enabled: true,
    whatsapp_flows: true,
    multi_branch: true,
    staff_roles: true,
    kds_enabled: true,
    api_access: true,
    white_label: true,
    max_menu_items: -1,
    max_staff: -1,
    branding: false,
    languages: ['en', 'hi', 'ta', 'te', 'mr', 'bn', 'kn', 'ml', 'gu', 'pa'],
  },
};

export interface PlanConfig {
  conversations_per_month: number;
  ai_enabled: boolean;
  ordering_enabled: boolean;
  payments_enabled: boolean;
  campaigns_enabled: boolean;
  loyalty_enabled: boolean;
  voice_ordering: boolean;
  scheduled_ordering: boolean;
  coupons_enabled: boolean;
  combos_enabled: boolean;
  whatsapp_flows: boolean;
  multi_branch: boolean;
  staff_roles: boolean;
  kds_enabled: boolean;
  api_access: boolean;
  white_label: boolean;
  max_menu_items: number;
  max_staff: number;
  branding: boolean;
  languages: string[];
}

// ─── WhatsApp Business Profile ──────────────
export interface WhatsAppBusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  vertical?: string;
  websites?: string[];
}

// ─── Ice Breakers ───────────────────────────
export interface IceBreaker {
  question: string;
}

// ─── Campaign Limits (per plan) ─────────────
export interface CampaignLimits {
  campaigns_per_month: number;
  messages_per_campaign: number;
  daily_send_cap: number;
}

export const CAMPAIGN_LIMITS: Record<PlanTier, CampaignLimits> = {
  free: { campaigns_per_month: 0, messages_per_campaign: 0, daily_send_cap: 0 },
  starter: { campaigns_per_month: 2, messages_per_campaign: 100, daily_send_cap: 50 },
  growth: { campaigns_per_month: 10, messages_per_campaign: 500, daily_send_cap: 200 },
  enterprise: { campaigns_per_month: 50, messages_per_campaign: 2000, daily_send_cap: 1000 },
};

// ─── Facebook SDK Types ─────────────────────
export interface FBLoginResponse {
  authResponse?: {
    accessToken: string;
    code?: string;
    userID: string;
    expiresIn: number;
  };
  status: 'connected' | 'not_authorized' | 'unknown';
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options?: {
          config_id?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
        }
      ) => void;
      getLoginStatus: (callback: (response: FBLoginResponse) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

