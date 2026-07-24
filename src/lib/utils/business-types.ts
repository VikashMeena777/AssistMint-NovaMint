// ============================================
// AssistMint — Business Type Configurations
// Maps business_type to labels, icons, and default settings
// ============================================

export type BusinessType = 'food_beverage' | 'salon_spa' | 'healthcare' | 'education' | 'retail' | 'services';

export interface BusinessTypeConfig {
  type: BusinessType;
  label: string;
  emoji: string;
  description: string;
  // Dynamic sidebar labels
  sidebar: {
    menu: string;
    orders: string;
    combos: string;
    customers: string;
  };
  // WhatsApp greeting buttons
  greetingButtons: Array<{ id: string; title: string }>;
  // Default AI persona
  defaultPersona: string;
  // Whether this business type supports cart/ordering
  supportsCart: boolean;
  // Whether this business type supports appointments
  supportsAppointments: boolean;
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  food_beverage: {
    type: 'food_beverage',
    label: 'Restaurant / Cafe / Food',
    emoji: '🍕',
    description: 'Restaurants, cafes, cloud kitchens, bakeries, sweet shops, juice shops',
    sidebar: {
      menu: 'Menu',
      orders: 'Orders',
      combos: 'Combos',
      customers: 'Customers',
    },
    greetingButtons: [
      { id: 'view_menu', title: '📋 View Menu' },
      { id: 'reorder_last', title: '🔄 Reorder Last' },
      { id: 'my_orders', title: '📦 My Orders' },
    ],
    defaultPersona: 'You are a friendly restaurant ordering assistant. Help customers browse the menu, place orders, and track deliveries.',
    supportsCart: true,
    supportsAppointments: false,
  },
  salon_spa: {
    type: 'salon_spa',
    label: 'Salon / Spa / Beauty',
    emoji: '💇',
    description: 'Salons, spas, barber shops, beauty parlors',
    sidebar: {
      menu: 'Services',
      orders: 'Appointments',
      combos: 'Packages',
      customers: 'Clients',
    },
    greetingButtons: [
      { id: 'view_menu', title: '💇 Our Services' },
      { id: 'book_appointment', title: '📅 Book Appointment' },
      { id: 'my_orders', title: '📋 My Appointments' },
    ],
    defaultPersona: 'You are a friendly salon booking assistant. Help clients browse services, book appointments, and manage their bookings.',
    supportsCart: false,
    supportsAppointments: true,
  },
  healthcare: {
    type: 'healthcare',
    label: 'Clinic / Healthcare',
    emoji: '🏥',
    description: 'Clinics, labs, pharmacies, dentists',
    sidebar: {
      menu: 'Services',
      orders: 'Appointments',
      combos: 'Packages',
      customers: 'Patients',
    },
    greetingButtons: [
      { id: 'view_menu', title: '👨‍⚕️ Our Doctors' },
      { id: 'book_appointment', title: '📅 Book Appointment' },
      { id: 'contact_us', title: '📞 Emergency Contact' },
    ],
    defaultPersona: 'You are a helpful clinic assistant. Help patients find doctors, book appointments, and get information about services.',
    supportsCart: false,
    supportsAppointments: true,
  },
  education: {
    type: 'education',
    label: 'Coaching / Education',
    emoji: '📚',
    description: 'Coaching centers, tuition classes, hobby classes, yoga studios',
    sidebar: {
      menu: 'Courses',
      orders: 'Inquiries',
      combos: 'Bundles',
      customers: 'Students',
    },
    greetingButtons: [
      { id: 'view_menu', title: '📋 Our Courses' },
      { id: 'book_appointment', title: '📅 Book Demo Class' },
      { id: 'contact_us', title: '❓ Ask a Question' },
    ],
    defaultPersona: 'You are a helpful education counselor. Help students explore courses, check fees, book demo classes, and answer questions.',
    supportsCart: false,
    supportsAppointments: true,
  },
  retail: {
    type: 'retail',
    label: 'Shop / Retail',
    emoji: '🛒',
    description: 'Clothing boutiques, electronics shops, gift shops, stationery',
    sidebar: {
      menu: 'Products',
      orders: 'Orders',
      combos: 'Bundles',
      customers: 'Customers',
    },
    greetingButtons: [
      { id: 'view_menu', title: '🛍️ Browse Products' },
      { id: 'my_orders', title: '📦 Track Order' },
      { id: 'contact_us', title: '💬 Ask a Question' },
    ],
    defaultPersona: 'You are a friendly shop assistant. Help customers browse products, check availability, place orders, and track deliveries.',
    supportsCart: true,
    supportsAppointments: false,
  },
  services: {
    type: 'services',
    label: 'Services (Plumber, AC, etc.)',
    emoji: '🏠',
    description: 'Home services, pest control, cleaning, event planners',
    sidebar: {
      menu: 'Services',
      orders: 'Bookings',
      combos: 'Packages',
      customers: 'Customers',
    },
    greetingButtons: [
      { id: 'view_menu', title: '🔧 Our Services' },
      { id: 'book_appointment', title: '📅 Book Service' },
      { id: 'contact_us', title: '📞 Contact Us' },
    ],
    defaultPersona: 'You are a helpful service booking assistant. Help customers find the right service, book appointments, and get pricing information.',
    supportsCart: false,
    supportsAppointments: true,
  },
};

/**
 * Get business type config with fallback to food_beverage.
 */
export function getBusinessTypeConfig(type: string | null | undefined): BusinessTypeConfig {
  if (type && type in BUSINESS_TYPES) {
    return BUSINESS_TYPES[type as BusinessType];
  }
  return BUSINESS_TYPES.food_beverage;
}

/**
 * Get all business types as an array (for selection UIs).
 */
export function getAllBusinessTypes(): BusinessTypeConfig[] {
  return Object.values(BUSINESS_TYPES);
}
