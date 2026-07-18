'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRestaurant, updateWhatsAppConfig, startStarterTrial } from '@/lib/actions/restaurant-actions';
import { createCategory, createMenuItem } from '@/lib/actions/menu-actions';
import { toast } from 'sonner';

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
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              i < currentStep
                ? 'bg-emerald-500 text-white'
                : i === currentStep
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500'
                : 'bg-white/5 text-white/30'
            }`}
          >
            {i < currentStep ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 ${
                i < currentStep ? 'bg-emerald-500' : 'bg-white/10'
              }`}
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

  const steps = ['Restaurant', 'WhatsApp', 'Menu', 'Launch'];

  // ── Auto-generate slug ──
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setRestaurant({ ...restaurant, name, slug });
  };

  // ── Step 1: Create Restaurant ──
  const handleCreateRestaurant = async () => {
    if (!restaurant.name || !restaurant.slug) {
      setError('Restaurant name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createRestaurant(restaurant);
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
          toast.success('🎉 14-day Starter trial activated!');
        }
        localStorage.removeItem('assistmint_trial_plan');
      }
    } catch {
      // Non-critical — user can activate trial later
    }

    setLoading(false);
    setStep(1);
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
    setStep(2);
  };

  // ── Step 3: Add Sample Menu ──
  const handleMenuSetup = async () => {
    setLoading(true);
    setError('');

    if (addSampleMenu) {
      const sampleCategories: SampleCategory[] = [
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

      for (let ci = 0; ci < sampleCategories.length; ci++) {
        const cat = sampleCategories[ci];
        const catResult = await createCategory(restaurantId, {
          name: cat.name,
          display_order: ci,
        });

        if (catResult.error) continue;
        const categoryData = catResult.data as Record<string, unknown>;
        const categoryId = categoryData.id as string;

        for (let ii = 0; ii < cat.items.length; ii++) {
          const item = cat.items[ii];
          await createMenuItem(restaurantId, {
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            is_veg: item.is_veg,
            display_order: ii,
          });
        }
      }
    }

    setLoading(false);
    setStep(3);
  };

  // ── Step 4: Launch ──
  const handleLaunch = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-emerald-400 mb-2">🌿 AssistMint</div>
          <p className="text-white/50">Set up your AI-powered ordering assistant</p>
        </div>

        <StepIndicator currentStep={step} steps={steps} />

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Restaurant Details */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Restaurant Details</h2>
              <p className="text-white/40 text-sm">Tell us about your restaurant</p>

              <div>
                <label className="block text-sm text-white/60 mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  value={restaurant.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                  placeholder="e.g. Spice Garden"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-sm">assistmint.com/</span>
                  <input
                    type="text"
                    value={restaurant.slug}
                    onChange={(e) => setRestaurant({ ...restaurant, slug: e.target.value })}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                    placeholder="spice-garden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={restaurant.phone}
                    onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Cuisine</label>
                  <input
                    type="text"
                    value={restaurant.cuisine}
                    onChange={(e) => setRestaurant({ ...restaurant, cuisine: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                    placeholder="Indian, Chinese..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Address</label>
                <input
                  type="text"
                  value={restaurant.address}
                  onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  placeholder="123 Main St, City"
                />
              </div>

              <button
                onClick={handleCreateRestaurant}
                disabled={loading || !restaurant.name}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step 2: WhatsApp Config */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Connect WhatsApp</h2>
              <p className="text-white/40 text-sm">
                Connect your WhatsApp Business number so customers can message you directly.
              </p>

              {/* Embedded Signup Button */}
              <button
                onClick={() => {
                  const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';
                  if (!window.FB || !META_CONFIG_ID) {
                    // Fallback to manual if SDK not available
                    toast.error('Embedded Signup not available. Use manual entry or skip for now.');
                    return;
                  }
                  setLoading(true);
                  window.FB.login(
                    (response) => {
                      if (response.authResponse?.code) {
                        fetch('/api/whatsapp/connect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: response.authResponse.code }),
                        })
                          .then((r) => r.json())
                          .then((result) => {
                            setLoading(false);
                            if (result.error) {
                              setError(result.error);
                            } else {
                              toast.success('WhatsApp connected! 🎉');
                              setStep(2);
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
                      extras: {
                        setup: { solutionID: META_CONFIG_ID },
                        featureType: '',
                        sessionInfoVersion: 2,
                      },
                    }
                  );
                }}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Connecting...' : '🟢 Connect with WhatsApp'}
              </button>

              <div className="flex items-center justify-center gap-3 text-xs text-white/30">
                <span>✓ One-click setup</span>
                <span>•</span>
                <span>✓ Uses your existing number</span>
              </div>

              {/* Manual Entry (collapsible) */}
              <details className="group">
                <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors">
                  ▸ Advanced: Enter credentials manually
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Phone Number ID *</label>
                    <input
                      type="text"
                      value={whatsapp.whatsapp_phone_id}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_phone_id: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none font-mono text-sm"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Access Token *</label>
                    <input
                      type="password"
                      value={whatsapp.whatsapp_token}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_token: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none font-mono text-sm"
                      placeholder="EAAxx..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">WABA ID (optional)</label>
                    <input
                      type="text"
                      value={whatsapp.whatsapp_business_id}
                      onChange={(e) => setWhatsApp({ ...whatsapp, whatsapp_business_id: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:ring-2 focus:ring-emerald-500/50 outline-none font-mono text-sm"
                      placeholder="1234567890"
                    />
                  </div>
                  <button
                    onClick={handleWhatsAppConfig}
                    disabled={loading}
                    className="w-full bg-emerald-500/80 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save & Continue →'}
                  </button>
                </div>
              </details>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-300">
                <strong>Webhook URL:</strong>
                <code className="block mt-1 text-xs text-emerald-400/70 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/webhooks/whatsapp
                </code>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-2.5 rounded-lg transition-colors"
              >
                Skip for now — configure later in Settings
              </button>
            </div>
          )}

          {/* Step 3: Menu Setup */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Menu Setup</h2>
              <p className="text-white/40 text-sm">Add your first menu items or start with a sample</p>

              <div
                onClick={() => setAddSampleMenu(true)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  addSampleMenu
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${addSampleMenu ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`} />
                  <div>
                    <div className="text-white font-medium">Start with sample menu</div>
                    <div className="text-white/40 text-sm">3 categories, 9 items — you can edit later</div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setAddSampleMenu(false)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  !addSampleMenu
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${!addSampleMenu ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`} />
                  <div>
                    <div className="text-white font-medium">I&apos;ll add my own menu</div>
                    <div className="text-white/40 text-sm">Set up from scratch in the dashboard</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleMenuSetup}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Setting up menu...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step 4: Launch! */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
              <p className="text-white/50">
                Your AI ordering assistant is ready. Head to the dashboard to manage your menu, view orders, and customize your bot.
              </p>

              <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✅</span> Restaurant created
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✅</span> WhatsApp configured
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✅</span> {addSampleMenu ? 'Sample menu added (9 items)' : 'Ready for menu setup'}
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✅</span> AI assistant active
                </div>
                {trialActivated && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <span>⭐</span> Starter plan trial active (14 days)
                  </div>
                )}
              </div>

              <button
                onClick={handleLaunch}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors text-lg"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Step {step + 1} of {steps.length} • AssistMint
        </p>
      </div>
    </div>
  );
}
