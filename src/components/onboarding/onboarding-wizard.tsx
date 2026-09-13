'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createRestaurant, updateWhatsAppConfig, startStarterTrial } from '@/lib/actions/restaurant-actions';
import { createCategory, createMenuItem } from '@/lib/actions/menu-actions';
import { toast } from 'sonner';
import { getAllBusinessTypes, getBusinessTypeConfig, type BusinessType } from '@/lib/utils/business-types';

// ─── Types ──────────────────────────────────

interface RestaurantData {
  name: string;
  slug: string;
  phone: string;
  address: string;
  cuisine: string;
  description: string;
}

interface WhatsAppData {
  whatsapp_phone_id: string;
  whatsapp_token: string;
  whatsapp_business_id: string;
}

interface SampleCategory {
  name: string;
  items: Array<{
    name: string;
    price: number;
    is_veg: boolean;
    description: string;
  }>;
}

// ─── Step Indicator ─────────────────────────

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-1.5 sm:gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold font-mono tabular-nums transition-all ${
              i < currentStep
                ? 'bg-primary text-primary-foreground'
                : i === currentStep
                ? 'bg-primary/10 text-primary ring-2 ring-primary/40'
                : 'bg-muted text-muted-foreground/50'
            }`}
          >
            {i < currentStep ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-5 sm:w-10 ${i < currentStep ? 'bg-primary' : 'bg-border'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard ────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [origin, setOrigin] = useState('');

  // ── Embedded Signup session info ──
  // The WhatsApp Business Account + Phone Number IDs arrive via postMessage
  // DURING the FB.login popup (WA_EMBEDDED_SIGNUP events), not in the login
  // callback — capture them here so the connect call includes both.
  const sessionInfoRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.data?.phone_number_id) {
            sessionInfoRef.current = {
              waba_id: data.data.waba_id,
              phone_number_id: data.data.phone_number_id,
            };
          }
        }
      } catch {
        // Not a JSON message, ignore
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Read origin after mount so SSR and client render identical values
  useEffect(() => {
    void (async () => {
      setOrigin(window.location.origin);
    })();
  }, []);

  const [restaurant, setRestaurant] = useState<RestaurantData>({
    name: '',
    slug: '',
    phone: '',
    address: '',
    cuisine: '',
    description: '',
  });

  const [whatsapp, setWhatsApp] = useState<WhatsAppData>({
    whatsapp_phone_id: '',
    whatsapp_token: '',
    whatsapp_business_id: '',
  });

  const [addSampleMenu, setAddSampleMenu] = useState(true);
  const [trialActivated, setTrialActivated] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('food_beverage');

  const steps = ['Business', 'Details', 'WhatsApp', 'Menu', 'Launch'];

  // ── Auto-generate slug ──
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setRestaurant({ ...restaurant, name, slug });
  };

  // ── Step 1: Create Restaurant (was Step 0) ──
  const handleCreateRestaurant = async () => {
    if (!restaurant.name || !restaurant.slug) {
      setError('Business name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createRestaurant({
      ...restaurant,
      business_type: selectedBusinessType,
    });
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const data = result.data as Record<string, unknown>;
    const newId = data.id as string;
    setRestaurantId(newId);

    // Auto-activate Starter trial if user selected it on signup
    try {
      const trialPlan = localStorage.getItem('assistmint_trial_plan');
      if (trialPlan === 'starter') {
        const trialResult = await startStarterTrial(newId);
        if (trialResult.success) {
          setTrialActivated(true);
          toast.success('14-day Starter trial activated!');
        }
        localStorage.removeItem('assistmint_trial_plan');
      }
    } catch {
      // Non-critical — user can activate trial later
    }

    setLoading(false);
    setStep(2);
  };

  // ── Step 2: Configure WhatsApp ──
  const handleWhatsAppConfig = async () => {
    if (!whatsapp.whatsapp_phone_id || !whatsapp.whatsapp_token) {
      setError('Phone Number ID and Access Token are required.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await updateWhatsAppConfig(restaurantId, whatsapp);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep(3);
  };

  // ── Step 3: Add Sample Menu ──
  const handleMenuSetup = async () => {
    setLoading(true);
    setError('');

    if (addSampleMenu) {
      const getSampleCategories = (type: BusinessType): SampleCategory[] => {
        switch (type) {
          case 'salon_spa':
            return [
              {
                name: 'Hair Services',
                items: [
                  { name: 'Haircut & Styling', price: 49900, is_veg: false, description: 'Professional haircut, wash, and blow-dry styling' },
                  { name: 'Hair Coloring (Global)', price: 199900, is_veg: false, description: 'Full hair color with premium ammonia-free products' },
                  { name: 'Keratin Treatment', price: 299900, is_veg: false, description: 'Smoothing treatment for frizz-free, shiny hair' },
                ],
              },
              {
                name: 'Spa & Massage',
                items: [
                  { name: 'Deep Tissue Massage (60 min)', price: 149900, is_veg: false, description: 'Therapeutic deep muscle massage for pain relief' },
                  { name: 'Swedish Body Massage (60 min)', price: 129900, is_veg: false, description: 'Relaxing full-body oil massage with aroma oils' },
                  { name: 'Head & Shoulder Relief (30 min)', price: 69900, is_veg: false, description: 'Quick stress buster head and neck massage' },
                ],
              },
              {
                name: 'Skin & Beauty',
                items: [
                  { name: 'Gold Glow Facial', price: 119900, is_veg: false, description: 'Radiance facial for skin brightening and hydration' },
                  { name: 'Pedicure & Manicure Combo', price: 89900, is_veg: false, description: 'Complete nail care, scrub, and foot massage' },
                  { name: 'Express Skin Clean-Up', price: 59900, is_veg: false, description: 'Deep pore cleansing and exfoliating scrub' },
                ],
              },
            ];

          case 'healthcare':
            return [
              {
                name: 'Consultations',
                items: [
                  { name: 'General Physician Consultation', price: 50000, is_veg: false, description: 'Routine checkup and medical advice' },
                  { name: 'Specialist Consultation', price: 80000, is_veg: false, description: 'Consultation with senior specialist doctor' },
                  { name: 'Tele-Consultation (Online)', price: 40000, is_veg: false, description: 'Video consultation from the comfort of home' },
                ],
              },
              {
                name: 'Diagnostics & Health Checkups',
                items: [
                  { name: 'Full Body Checkup Package', price: 199900, is_veg: false, description: 'Includes 60+ vital tests: Blood, Liver, Kidney, Lipid' },
                  { name: 'Diabetes Monitoring Panel', price: 69900, is_veg: false, description: 'HbA1c, Fasting Blood Sugar, and Lipid profile' },
                ],
              },
            ];

          case 'education':
            return [
              {
                name: 'Foundation Courses',
                items: [
                  { name: 'Class 10 Science & Math Booster', price: 499900, is_veg: false, description: 'Complete board exam prep with weekly tests' },
                  { name: 'Class 12 Physics & Chemistry', price: 699900, is_veg: false, description: 'Comprehensive coaching with doubt clearing sessions' },
                ],
              },
              {
                name: 'Competitive Exam Prep',
                items: [
                  { name: 'JEE Main & Advanced Batch', price: 1499900, is_veg: false, description: '1-Year intensive preparation with mock tests' },
                  { name: 'NEET Biology Masterclass', price: 1299900, is_veg: false, description: 'Targeted NCERT-focused course for medical aspirants' },
                ],
              },
            ];

          case 'retail':
            return [
              {
                name: 'Apparel & Clothing',
                items: [
                  { name: 'Cotton Casual Shirt', price: 89900, is_veg: false, description: '100% breathable cotton slim fit shirt' },
                  { name: 'Denim Jeans (Blue)', price: 149900, is_veg: false, description: 'Stretch denim jeans with classic 5-pocket styling' },
                ],
              },
              {
                name: 'Accessories',
                items: [
                  { name: 'Leather Slim Wallet', price: 59900, is_veg: false, description: 'Genuine leather minimalist bi-fold wallet' },
                  { name: 'Polarized Sunglasses', price: 99900, is_veg: false, description: 'UV400 protection lightweight metal frame glasses' },
                ],
              },
            ];

          case 'services':
            return [
              {
                name: 'Home Appliance Repairs',
                items: [
                  { name: 'AC Service & General Cleaning', price: 59900, is_veg: false, description: 'Filter cleaning, gas check, and cooling inspection' },
                  { name: 'Washing Machine Repair', price: 39900, is_veg: false, description: 'Inspection, diagnosis, and minor repairs' },
                ],
              },
              {
                name: 'Cleaning & Pest Control',
                items: [
                  { name: 'Deep Home Cleaning (2 BHK)', price: 249900, is_veg: false, description: 'Complete deep cleaning including kitchen and bathrooms' },
                  { name: 'Pest Control Treatment', price: 99900, is_veg: false, description: 'Eco-friendly cockroach and ant pest treatment' },
                ],
              },
            ];

          case 'food_beverage':
          default:
            return [
              {
                name: 'Starters',
                items: [
                  { name: 'Paneer Tikka', price: 24900, is_veg: true, description: 'Tandoor-grilled cottage cheese with spices' },
                  { name: 'Chicken 65', price: 27900, is_veg: false, description: 'Crispy fried chicken with curry leaves' },
                  { name: 'Masala Papad', price: 6900, is_veg: true, description: 'Crispy papad topped with onion, tomato masala' },
                ],
              },
              {
                name: 'Main Course',
                items: [
                  { name: 'Dal Makhani', price: 22900, is_veg: true, description: 'Creamy black lentils slow-cooked overnight' },
                  { name: 'Butter Chicken', price: 29900, is_veg: false, description: 'Tender chicken in rich tomato-butter gravy' },
                  { name: 'Palak Paneer', price: 21900, is_veg: true, description: 'Cottage cheese in spinach gravy' },
                ],
              },
              {
                name: 'Beverages',
                items: [
                  { name: 'Masala Chai', price: 4900, is_veg: true, description: 'Traditional Indian spiced tea' },
                  { name: 'Mango Lassi', price: 8900, is_veg: true, description: 'Refreshing yogurt-mango smoothie' },
                  { name: 'Fresh Lime Soda', price: 6900, is_veg: true, description: 'Chilled lime soda, sweet or salty' },
                ],
              },
            ];
        }
      };

      const sampleCategories = getSampleCategories(selectedBusinessType);
      let categoriesFailed = 0;
      let itemsFailed = 0;

      for (let ci = 0; ci < sampleCategories.length; ci++) {
        const cat = sampleCategories[ci];
        const catResult = await createCategory(restaurantId, {
          name: cat.name,
          display_order: ci,
        });

        if (catResult.error) {
          categoriesFailed++;
          continue;
        }
        const categoryData = catResult.data as Record<string, unknown>;
        const categoryId = categoryData.id as string;

        for (let ii = 0; ii < cat.items.length; ii++) {
          const item = cat.items[ii];
          const itemResult = await createMenuItem(restaurantId, {
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            is_veg: item.is_veg,
            display_order: ii,
          });
          if (itemResult.error) itemsFailed++;
        }
      }

      // Surface partial seeding failures instead of failing silently
      if (categoriesFailed > 0 || itemsFailed > 0) {
        toast.warning(
          `Sample catalog partially added — ${categoriesFailed} categories and ${itemsFailed} items failed. You can add them manually from the dashboard.`
        );
      }
    }

    setLoading(false);
    setStep(4);
  };

  // ── Step 4: Launch ──
  const handleLaunch = () => {
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 paper">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="font-heading text-2xl font-bold tracking-tight text-foreground mb-1">
            AssistMint
          </div>
          <p className="text-sm text-muted-foreground">
            Set up your AI-powered ordering assistant
          </p>
        </div>

        <StepIndicator currentStep={step} steps={steps} />

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 0: Business Type Selection */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">What type of business do you run?</h2>
              <p className="text-sm text-muted-foreground">This customizes your entire dashboard experience.</p>

              <div className="grid grid-cols-2 gap-3">
                {getAllBusinessTypes().map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => setSelectedBusinessType(bt.type)}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                      selectedBusinessType === bt.type
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-background hover:border-primary/30 hover:bg-secondary'
                    }`}
                  >
                    <span className="mb-1.5 text-2xl">{bt.emoji}</span>
                    <span className="text-sm font-medium">{bt.label}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{bt.description}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setError(''); setStep(1); }}
                className="stamp w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 1: Business Details */}
          {step === 1 && (() => {
            // Dynamic labels based on business type
            const labelMap: Record<string, { nameLabel: string; namePlaceholder: string; secondLabel: string; secondPlaceholder: string }> = {
              food_beverage: { nameLabel: 'Restaurant Name', namePlaceholder: 'e.g. Spice Garden', secondLabel: 'Cuisine', secondPlaceholder: 'Indian, Chinese...' },
              salon_spa: { nameLabel: 'Salon / Spa Name', namePlaceholder: 'e.g. Glow Beauty Salon', secondLabel: 'Specialization', secondPlaceholder: 'Hair, Nails, Spa...' },
              healthcare: { nameLabel: 'Clinic / Hospital Name', namePlaceholder: 'e.g. City Care Clinic', secondLabel: 'Specialization', secondPlaceholder: 'General, Dental, Ortho...' },
              education: { nameLabel: 'Institute / Academy Name', namePlaceholder: 'e.g. Excel Academy', secondLabel: 'Courses Offered', secondPlaceholder: 'JEE, NEET, Spoken English...' },
              retail: { nameLabel: 'Shop / Store Name', namePlaceholder: 'e.g. Style Studio', secondLabel: 'Category', secondPlaceholder: 'Clothing, Electronics...' },
              services: { nameLabel: 'Business Name', namePlaceholder: 'e.g. FixIt Services', secondLabel: 'Services', secondPlaceholder: 'AC Repair, Plumbing...' },
            };
            const labels = labelMap[selectedBusinessType] || labelMap.food_beverage;
            const inputClass =
              'w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/30';
            return (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Business Details</h2>
              <p className="text-sm text-muted-foreground">Tell us about your business</p>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{labels.nameLabel} *</label>
                <input
                  type="text"
                  value={restaurant.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputClass}
                  placeholder={labels.namePlaceholder}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground sm:text-sm">{origin}/</span>
                  <input
                    type="text"
                    value={restaurant.slug}
                    onChange={(e) => setRestaurant({ ...restaurant, slug: e.target.value })}
                    className={`${inputClass} font-mono`}
                    placeholder="my-business"
                  />
                </div>
                {restaurant.slug && (
                  <p className="mt-1.5 break-all font-mono text-xs text-muted-foreground">
                    Preview: {origin}/{restaurant.slug}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    value={restaurant.phone}
                    onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                    className={`${inputClass} font-mono tabular-nums`}
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{labels.secondLabel}</label>
                  <input
                    type="text"
                    value={restaurant.cuisine}
                    onChange={(e) => setRestaurant({ ...restaurant, cuisine: e.target.value })}
                    className={inputClass}
                    placeholder={labels.secondPlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Address</label>
                <input
                  type="text"
                  value={restaurant.address}
                  onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
                  className={inputClass}
                  placeholder="123 Main St, City"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(''); setStep(0); }}
                  className="rounded-lg border border-border bg-background px-6 py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateRestaurant}
                  disabled={loading || !restaurant.name}
                  className="stamp flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Continue →'}
                </button>
              </div>
            </div>
            );
          })()}

          {/* Step 2: WhatsApp Config */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Connect WhatsApp</h2>
              <p className="text-sm text-muted-foreground">
                Connect your WhatsApp Business number so customers can message you directly.
              </p>

              {/* Coexistence — for merchants already on the WhatsApp Business app */}
              <div className="rounded-xl border bg-secondary/40 p-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Already using the WhatsApp Business app?
                  </span>{" "}
                  Keep your number and your chats — connecting here adds the AI front desk
                  alongside the app. Your one-to-one conversations keep working in the app;
                  new customer messages get instant AI replies 24×7.
                </p>
              </div>

              {/* Embedded Signup Button */}
              <button
                onClick={() => {
                  const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';
                  if (!window.FB || !META_CONFIG_ID) {
                    // SDK not ready — show manual entry so user can connect
                    toast.error('One-click setup not available yet. Enter credentials manually below.');
                    // Open the details element programmatically
                    const details = document.querySelector('details.group') as HTMLDetailsElement;
                    if (details) details.open = true;
                    return;
                  }
                  setLoading(true);
                  window.FB.login(
                    (response) => {
                      if (response.authResponse?.code) {
                        fetch('/api/whatsapp/connect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: response.authResponse.code,
                            // session_info arrives via postMessage during signup
                            // (WABA + phone ids) — captured by the listener below
                            waba_id: sessionInfoRef.current.waba_id,
                            phone_number_id: sessionInfoRef.current.phone_number_id,
                          }),
                        })
                          .then((r) => r.json())
                          .then((result) => {
                            setLoading(false);
                            if (result.error) {
                              setError(result.error);
                            } else {
                              toast.success('WhatsApp connected!');
                              setStep(3);
                            }
                          })
                          .catch(() => {
                            setLoading(false);
                            setError('Connection failed. Try again or skip.');
                          });
                      } else {
                        setLoading(false);
                      }
                    },
                    {
                      config_id: META_CONFIG_ID,
                      response_type: 'code',
                      override_default_response_type: true,
                      // Tech Provider standalone: NO solutionID (that's only for
                      // Multi-Partner Solutions — the config id is not one).
                      // v4 session format; ES v2 deprecated 2026-10-15.
                      extras: { setup: {}, version: 'v4' },
                    }
                  );
                }}
                disabled={loading}
                className="stamp flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect with WhatsApp'}
              </button>

              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span>✓ One-click setup</span>
                <span>•</span>
                <span>✓ Uses your existing number</span>
                <span>•</span>
                <span>✓ Keep your chats</span>
              </div>

              {/* Manual Entry (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                  ▸ Advanced: Enter credentials manually
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Phone Number ID *</label>
                    <input
                      type="text"
                      value={whatsapp.whatsapp_phone_id}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_phone_id: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Access Token *</label>
                    <input
                      type="password"
                      value={whatsapp.whatsapp_token}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_token: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
                      placeholder="EAAxx..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">WABA ID (optional)</label>
                    <input
                      type="text"
                      value={whatsapp.whatsapp_business_id}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_business_id: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
                      placeholder="1234567890"
                    />
                  </div>
                  <button
                    onClick={handleWhatsAppConfig}
                    disabled={loading}
                    className="stamp w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save & Continue →'}
                  </button>
                </div>
              </details>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <strong className="text-primary">Webhook URL:</strong>
                <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                  {origin}/api/webhooks/whatsapp
                </code>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(''); setStep(1); }}
                  className="rounded-lg border border-border bg-background px-6 py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-lg border border-border bg-background py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Skip for now — configure later
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Catalog / Menu Setup */}
          {step === 3 && (() => {
            const config = getBusinessTypeConfig(selectedBusinessType);
            const terms = config.terms;
            return (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{terms.setupCatalog}</h2>
              <p className="text-sm text-muted-foreground">{terms.setupCatalogDesc}</p>

              <div
                onClick={() => setAddSampleMenu(true)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  addSampleMenu
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/30 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 ${addSampleMenu ? 'border-primary bg-primary' : 'border-border'}`} />
                  <div>
                    <div className="font-medium">Start with sample {terms.catalog.toLowerCase()}</div>
                    <div className="text-sm text-muted-foreground">Sample categories & items pre-configured — edit anytime</div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setAddSampleMenu(false)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  !addSampleMenu
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/30 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 ${!addSampleMenu ? 'border-primary bg-primary' : 'border-border'}`} />
                  <div>
                    <div className="font-medium">I&apos;ll add my own {terms.catalog.toLowerCase()}</div>
                    <div className="text-sm text-muted-foreground">Set up from scratch in the dashboard</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(''); setStep(2); }}
                  className="rounded-lg border border-border bg-background px-6 py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  ← Back
                </button>
                <button
                  onClick={handleMenuSetup}
                  disabled={loading}
                  className="stamp flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Continue →'}
                </button>
              </div>
            </div>
            );
          })()}

          {/* Step 4: Launch! */}
          {step === 4 && (() => {
            const config = getBusinessTypeConfig(selectedBusinessType);
            const terms = config.terms;
            return (
            <div className="space-y-4 py-4 text-center">
              <div className="text-5xl">🚀</div>
              <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground">
                Your AI assistant is ready. Head to your dashboard to {terms.launchSubtext}.
              </p>

              <div className="rounded-xl border border-border bg-background p-4 text-left text-sm">
                <div className="flex items-center gap-2 text-success">
                  <span>✅</span> Business profile created ({config.label})
                </div>
                <div className="flex items-center gap-2 text-success">
                  <span>✅</span> WhatsApp assistant configured
                </div>
                <div className="flex items-center gap-2 text-success">
                  <span>✅</span> {addSampleMenu ? terms.sampleAddedText : `Ready for ${terms.catalog.toLowerCase()} setup`}
                </div>
                <div className="flex items-center gap-2 text-success">
                  <span>✅</span> AI persona active
                </div>
                {trialActivated && (
                  <div className="flex items-center gap-2 text-warning">
                    <span>⭐</span> Starter plan trial active (14 days)
                  </div>
                )}
              </div>

              <button
                onClick={handleLaunch}
                className="stamp w-full rounded-lg bg-primary py-3 text-lg font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Go to Dashboard →
              </button>
            </div>
            );
          })()}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center font-mono text-xs text-muted-foreground tabular-nums">
          Step {step + 1} of {steps.length} • AssistMint
        </p>
      </div>
    </div>
  );
}
