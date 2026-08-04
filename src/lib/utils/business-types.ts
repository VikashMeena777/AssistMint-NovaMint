// ============================================
// AssistMint — Business Type Configurations
// Maps business_type to labels, icons, default terms, and settings
// ============================================

export type BusinessType = 'food_beverage' | 'salon_spa' | 'healthcare' | 'education' | 'retail' | 'services';

export interface BusinessTypeTerms {
  catalog: string;            // Menu / Services / Courses / Products / Services
  catalogAdd: string;         // Add Menu Item / Add Service / Add Course / Add Product / Add Service
  itemUnit: string;           // Dish / Service / Course / Product / Service
  customer: string;           // Customer / Client / Patient / Student / Customer
  customers: string;          // Customers / Clients / Patients / Students / Customers
  booking: string;            // Order / Appointment / Consultation / Demo Class / Order / Booking
  bookings: string;           // Orders / Appointments / Consultations / Demo Classes / Orders / Bookings
  bookingAction: string;      // View Orders / View Appointments / View Consultations / View Demo Classes / View Orders / View Bookings
  staff: string;              // Staff / Stylists / Doctors / Faculty / Staff / Technicians
  staffTitle: string;         // Staff & Team / Staff & Stylists / Doctors & Staff / Faculty & Tutors / Store Staff / Technicians & Crew
  combo: string;              // Combos & Offers / Service Packages / Health Packages / Course Bundles / Product Bundles / Service Packages
  comboAdd: string;           // Create Combo / Create Service Package / Create Health Package / Create Course Bundle / Create Product Bundle / Create Package
  comboDesc: string;          // Bundle menu items with a special price / Bundle popular services together / Bundle consultations and diagnostic tests / Combine courses together at a discounted fee / Combine products to boost order value / Bundle repair and maintenance services
  setupCatalog: string;       // Menu Setup / Services Setup / Medical Services Setup / Courses Setup / Product Catalog Setup / Service List Setup
  setupCatalogDesc: string;   // Add your first menu items or start with a sample / Add your first salon & spa services or start with a sample / Add consultation & diagnostic services or start with a sample / Add courses & subjects or start with a sample curriculum / Add products or start with a sample catalog / Add repair & maintenance services or start with a sample
  launchSubtext: string;      // manage your menu, view orders, and customize your bot / manage your services, view appointments, and customize your bot / manage medical services, view patient bookings, and customize your bot / manage courses, view student inquiries, and customize your bot / manage your catalog, view orders, and customize your bot / manage your service list, view bookings, and customize your bot
  sampleAddedText: string;    // Sample menu added / Sample services added / Sample health packages added / Sample curriculum added / Sample product catalog added / Sample service list added
}

export interface BusinessTypeConfig {
  type: BusinessType;
  label: string;
  emoji: string;
  description: string;
  terms: BusinessTypeTerms;
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
    terms: {
      catalog: 'Menu',
      catalogAdd: 'Add Menu Item',
      itemUnit: 'Item',
      customer: 'Customer',
      customers: 'Customers',
      booking: 'Order',
      bookings: 'Orders',
      bookingAction: 'View Orders',
      staff: 'Staff',
      staffTitle: 'Staff & Team',
      combo: 'Combos & Special Offers',
      comboAdd: 'Create Combo',
      comboDesc: 'Bundle menu items together with a special price to boost average order value.',
      setupCatalog: 'Menu Setup',
      setupCatalogDesc: 'Add your first menu items or start with a sample food menu',
      launchSubtext: 'manage your menu, view orders, and customize your bot',
      sampleAddedText: 'Sample menu added (9 items)',
    },
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
    terms: {
      catalog: 'Services & Pricing',
      catalogAdd: 'Add Service',
      itemUnit: 'Service',
      customer: 'Client',
      customers: 'Clients',
      booking: 'Appointment',
      bookings: 'Appointments',
      bookingAction: 'View Appointments',
      staff: 'Stylist / Staff',
      staffTitle: 'Staff & Stylists',
      combo: 'Service Packages',
      comboAdd: 'Create Service Package',
      comboDesc: 'Bundle popular hair, skin, and spa services together at a discounted price.',
      setupCatalog: 'Services Setup',
      setupCatalogDesc: 'Add your first salon & spa services or start with a sample service menu',
      launchSubtext: 'manage your services, view appointments, and customize your bot',
      sampleAddedText: 'Sample service catalog added (6 services)',
    },
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
    terms: {
      catalog: 'Services & Treatments',
      catalogAdd: 'Add Service',
      itemUnit: 'Service',
      customer: 'Patient',
      customers: 'Patients',
      booking: 'Consultation',
      bookings: 'Doctor Appointments',
      bookingAction: 'View Appointments',
      staff: 'Doctor / Specialist',
      staffTitle: 'Doctors & Medical Staff',
      combo: 'Health Packages',
      comboAdd: 'Create Health Package',
      comboDesc: 'Bundle consultation, lab diagnostic tests, and health checkups together.',
      setupCatalog: 'Medical Services Setup',
      setupCatalogDesc: 'Add consultation & diagnostic services or start with sample health services',
      launchSubtext: 'manage medical services, view patient appointments, and customize your bot',
      sampleAddedText: 'Sample medical services added',
    },
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
    terms: {
      catalog: 'Courses & Programs',
      catalogAdd: 'Add Course',
      itemUnit: 'Course',
      customer: 'Student',
      customers: 'Students',
      booking: 'Demo Class',
      bookings: 'Demo Classes & Admissions',
      bookingAction: 'View Demo Classes',
      staff: 'Educator / Tutor',
      staffTitle: 'Faculty & Tutors',
      combo: 'Course Bundles',
      comboAdd: 'Create Course Bundle',
      comboDesc: 'Combine foundation & advanced courses together at a discounted fee.',
      setupCatalog: 'Courses & Curriculum Setup',
      setupCatalogDesc: 'Add your courses & subjects or start with a sample course list',
      launchSubtext: 'manage courses, view student inquiries, and customize your bot',
      sampleAddedText: 'Sample course catalog added',
    },
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
    terms: {
      catalog: 'Products & Catalog',
      catalogAdd: 'Add Product',
      itemUnit: 'Product',
      customer: 'Customer',
      customers: 'Customers',
      booking: 'Order',
      bookings: 'Orders',
      bookingAction: 'View Orders',
      staff: 'Store Staff',
      staffTitle: 'Store Personnel',
      combo: 'Product Bundles',
      comboAdd: 'Create Product Bundle',
      comboDesc: 'Combine complementary items together to boost store sales.',
      setupCatalog: 'Product Catalog Setup',
      setupCatalogDesc: 'Add your products or start with a sample product catalog',
      launchSubtext: 'manage your catalog, view orders, and customize your bot',
      sampleAddedText: 'Sample product catalog added',
    },
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
    terms: {
      catalog: 'Services & Rates',
      catalogAdd: 'Add Service',
      itemUnit: 'Service',
      customer: 'Customer',
      customers: 'Customers',
      booking: 'Service Booking',
      bookings: 'Service Bookings',
      bookingAction: 'View Bookings',
      staff: 'Technician / Crew',
      staffTitle: 'Technicians & Field Crew',
      combo: 'Service Packages',
      comboAdd: 'Create Service Package',
      comboDesc: 'Bundle repair, maintenance, and inspection services together.',
      setupCatalog: 'Service List Setup',
      setupCatalogDesc: 'Add your home services or start with a sample service list',
      launchSubtext: 'manage your service list, view bookings, and customize your bot',
      sampleAddedText: 'Sample service list added',
    },
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
