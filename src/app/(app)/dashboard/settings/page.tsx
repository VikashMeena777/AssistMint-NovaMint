"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Store,
  Bot,
  CreditCard,
  Globe,
  Bell,
  Save,
  Loader2,
  MessageSquare,
  Webhook,
  Truck,
  Crown,
  Check,
  ArrowUpRight,
  Sparkles,
  Shield,
  Zap,
  PhoneCall,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentRestaurant,
  updateRestaurantSettings,
  startStarterTrial,
  updateRestaurantPaymentConfig,
  getRestaurantPaymentConfig,
} from "@/lib/actions/restaurant-actions";
import { getCurrentPlan, getPlanUsage, createPlanCheckout, verifyPlanPayment } from "@/lib/actions/billing-actions";
import { PLANS, PLAN_ORDER, formatLimit, getAnnualSavings, type PlanSlug, type BillingCycle } from "@/lib/utils/plan-limits";

const SETTINGS_TABS = [
  { id: "billing", label: "Billing", icon: Crown },
  { id: "restaurant", label: "Restaurant", icon: Store },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "ai", label: "AI Bot", icon: Bot },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "language", label: "Languages", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API & Webhooks", icon: Webhook },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RestaurantData = Record<string, any>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("billing");
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<RestaurantData>({});

  useEffect(() => {
    (async () => {
      const data = await getCurrentRestaurant();
      setRestaurant(data as RestaurantData);
      setFormData(data || {});
      setLoading(false);
    })();
  }, []);

  const handleChange = (key: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isDirty = useCallback(() => {
    if (!restaurant) return false;
    
    const keysToCheck = [
      "name",
      "phone",
      "cuisine_type",
      "city",
      "gst_number",
      "min_order_amount",
      "owner_whatsapp",
      "address",
      "business_hours",
      "delivery_fee_rules",
      "tax_rate",
      "ai_persona",
      "supported_languages",
      "business_type",
      "delivery_enabled",
      "pickup_enabled",
      "google_review_url",
    ];

    for (const key of keysToCheck) {
      const originalValue = restaurant[key];
      const currentValue = formData[key];

      if (typeof originalValue === "object" && originalValue !== null) {
        if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) {
          return true;
        }
      } else {
        const normalizedOriginal = originalValue === null || originalValue === undefined ? "" : String(originalValue);
        const normalizedCurrent = currentValue === null || currentValue === undefined ? "" : String(currentValue);
        if (normalizedOriginal !== normalizedCurrent) {
          return true;
        }
      }
    }

    return false;
  }, [restaurant, formData]);

  const handleSave = useCallback(async () => {
    if (!restaurant?.id) {
      toast.error("No restaurant found. Complete onboarding first.");
      return;
    }
    setSaving(true);

    // Destructure to exclude fields that are managed by separate tabs and saved via their own buttons
    const {
      notification_email,
      notify_new_order,
      notify_payment,
      notify_human_handoff,
      notify_daily_summary,
      whatsapp_phone_id,
      whatsapp_access_token,
      whatsapp_waba_id,
      ...savePayload
    } = formData;

    const result = await updateRestaurantSettings(restaurant.id, savePayload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved successfully! 🌿");
      setRestaurant({ ...formData });
    }
  }, [restaurant, formData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">No restaurant found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Complete onboarding to set up your restaurant.
        </p>
        <a
          href="/onboarding"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Complete Setup →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your restaurant, WhatsApp bot, and integrations.
          </p>
        </div>
        {isDirty() && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all animate-in fade-in zoom-in-95 duration-200"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Tab List */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          {activeTab === "restaurant" && (
            <RestaurantSettings data={formData} onChange={handleChange} />
          )}
          {activeTab === "whatsapp" && (
            <WhatsAppSettings
              data={formData}
              onChange={handleChange}
              restaurantId={restaurant.id}
            />
          )}
          {activeTab === "ai" && (
            <AISettings data={formData} onChange={handleChange} />
          )}
          {activeTab === "delivery" && (
            <DeliverySettings data={formData} onChange={handleChange} />
          )}
          {activeTab === "payments" && restaurant?.id && <PaymentSettings restaurantId={restaurant.id} />}
          {activeTab === "language" && (
            <LanguageSettings data={formData} onChange={handleChange} />
          )}
          {activeTab === "notifications" && restaurant?.id && <NotificationSettings restaurantId={restaurant.id} />}
          {activeTab === "api" && <APISettings />}
          {activeTab === "billing" && restaurant?.id && (
            <BillingSection restaurantId={restaurant.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantSettings({
  data,
  onChange,
}: {
  data: RestaurantData;
  onChange: (key: string, value: any) => void;
}) {
  const fields = [
    { key: "name", label: "Restaurant Name", placeholder: "e.g., Spice Garden" },
    { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210" },
    { key: "cuisine_type", label: "Cuisine Type", placeholder: "e.g., North Indian, Chinese" },
    { key: "city", label: "City", placeholder: "e.g., Jaipur" },
    { key: "gst_number", label: "GST Number", placeholder: "e.g., 08AAACH7409R1ZZ" },
    { key: "min_order_amount", label: "Minimum Order Amount (₹)", placeholder: "e.g., 200" },
    { key: "owner_whatsapp", label: "Owner WhatsApp (Order Alerts & Management)", placeholder: "e.g., +919876543210" },
  ];

  const daysOfWeek = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
  ];

  const [defaultOpen, setDefaultOpen] = useState("10:00");
  const [defaultClose, setDefaultClose] = useState("22:00");

  // Sync apply-to-all inputs with currently configured business hours on mount/data change
  useEffect(() => {
    if (data?.business_hours) {
      const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      for (const d of days) {
        const config = data.business_hours[d];
        if (config && config.open && config.close) {
          setDefaultOpen(config.open);
          setDefaultClose(config.close);
          break;
        }
      }
    }
  }, [data?.business_hours]);

  const applyDefaultToAll = () => {
    const updated: Record<string, any> = {};
    daysOfWeek.forEach((day) => {
      updated[day.key] = {
        open: defaultOpen,
        close: defaultClose,
        closed: false,
      };
    });
    onChange("business_hours", updated);
    toast.success("Applied default hours to all days! 🕐");
  };

  const updateDayHour = (dayKey: string, field: "open" | "close" | "closed", val: any) => {
    const currentHours = data.business_hours || {
      mon: { open: "10:00", close: "22:00" },
      tue: { open: "10:00", close: "22:00" },
      wed: { open: "10:00", close: "22:00" },
      thu: { open: "10:00", close: "22:00" },
      fri: { open: "10:00", close: "22:00" },
      sat: { open: "10:00", close: "22:00" },
      sun: { open: "10:00", close: "22:00" },
    };
    const dayConfig = currentHours[dayKey] || { open: "10:00", close: "22:00" };
    const updated = {
      ...currentHours,
      [dayKey]: {
        ...dayConfig,
        [field]: val,
      },
    };
    onChange("business_hours", updated);
  };

  return (
    <div className="space-y-6">
      {/* Restaurant Details */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Restaurant Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">{field.label}</label>
              <input
                type="text"
                value={data[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Full Address</label>
          <textarea
            value={data.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Full restaurant address..."
            rows={2}
            className="flex w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
          />
        </div>
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Google Review Link</label>
          <p className="text-xs text-muted-foreground">
            Customers who rate ⭐⭐⭐⭐+ will be redirected to leave a Google review
          </p>
          <input
            value={data.google_review_url || ""}
            onChange={(e) => onChange("google_review_url", e.target.value)}
            placeholder="https://g.page/r/your-business/review"
            className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Business Hours Settings */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold">Business Hours</h3>
            <p className="text-sm text-muted-foreground">
              Configure when your restaurant is open for receiving orders.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50 shrink-0">
            <input
              type="time"
              value={defaultOpen}
              onChange={(e) => setDefaultOpen(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:ring-0 p-1 w-16"
            />
            <span className="text-xs text-muted-foreground font-medium">to</span>
            <input
              type="time"
              value={defaultClose}
              onChange={(e) => setDefaultClose(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:ring-0 p-1 w-16"
            />
            <button
              onClick={applyDefaultToAll}
              type="button"
              className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              Apply to All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const currentHours = data.business_hours || {};
            const config = currentHours[day.key] || { open: "10:00", close: "22:00" };
            const isClosed = config.closed || config.is_closed || false;

            return (
              <div
                key={day.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!isClosed}
                      onChange={(e) => updateDayHour(day.key, "closed", !e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                  <span className="text-sm font-semibold min-w-[100px]">{day.label}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      isClosed
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    }`}
                  >
                    {isClosed ? "Closed" : "Open"}
                  </span>
                </div>

                {!isClosed && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Open:</span>
                      <input
                        type="time"
                        value={config.open || "10:00"}
                        onChange={(e) => updateDayHour(day.key, "open", e.target.value)}
                        className="flex h-9 w-24 rounded-lg border border-input bg-muted/30 px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Close:</span>
                      <input
                        type="time"
                        value={config.close || "22:00"}
                        onChange={(e) => updateDayHour(day.key, "close", e.target.value)}
                        className="flex h-9 w-24 rounded-lg border border-input bg-muted/30 px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WhatsAppSettings({
  data,
  onChange,
  restaurantId,
}: {
  data: RestaurantData;
  onChange: (key: string, value: string) => void;
  restaurantId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectStep, setConnectStep] = useState(0);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showIceBreakers, setShowIceBreakers] = useState(false);

  // Animated connecting steps
  const CONNECT_STEPS = [
    { icon: Shield, label: 'Authenticating with Meta', color: 'text-blue-400' },
    { icon: Zap, label: 'Exchanging access token', color: 'text-amber-400' },
    { icon: Webhook, label: 'Subscribing to webhooks', color: 'text-purple-400' },
    { icon: PhoneCall, label: 'Registering phone number', color: 'text-cyan-400' },
    { icon: CheckCircle2, label: 'Connected! Bot is live', color: 'text-emerald-400' },
  ];

  // Auto-progress connecting steps for visual feedback
  useEffect(() => {
    if (!connecting) {
      setConnectStep(0);
      return;
    }
    const timers = [1200, 2800, 4400, 6000].map((delay, i) =>
      setTimeout(() => setConnectStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [connecting]);

  // Profile state
  const [profile, setProfile] = useState({
    about: '', address: '', description: '', email: '', vertical: '', websites: '' as string, profile_picture_url: '' as string,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const profileLoadedRef = useRef(false);

  // Ice breaker state
  const [iceBreakers, setIceBreakers] = useState<string[]>([]);
  const [loadingIce, setLoadingIce] = useState(false);
  const [savingIce, setSavingIce] = useState(false);

  const [waitingForPopup, setWaitingForPopup] = useState(false);

  const isConnected = !!(data.whatsapp_phone_id && data.whatsapp_access_token);
  const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';

  // ── Embedded Signup (v4) ──
  // Store session info from postMessage (WABA ID + Phone Number ID)
  const sessionInfoRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          // data.data contains { phone_number_id, waba_id }
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

  const handleConnect = () => {
    // Try Embedded Signup first
    if (!window.FB) {
      toast.error('Facebook SDK failed to load. Enter credentials manually below.');
      setShowManual(true);
      return;
    }

    if (!META_CONFIG_ID) {
      toast.error('Embedded Signup config missing. Enter credentials manually below.');
      setShowManual(true);
      return;
    }

    // Reset session info
    sessionInfoRef.current = {};
    setWaitingForPopup(true);

    try {
      window.FB.login(
        (response) => {
          setWaitingForPopup(false);

          if (response.authResponse?.code) {
            // Popup closed with auth code — NOW show the connecting animation
            setConnecting(true);

            fetch('/api/whatsapp/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: response.authResponse.code,
                waba_id: sessionInfoRef.current.waba_id,
                phone_number_id: sessionInfoRef.current.phone_number_id,
              }),
            })
              .then((r) => r.json())
              .then((result) => {
                if (result.error) {
                  toast.error(result.error);
                  setShowManual(true);
                } else {
                  toast.success('WhatsApp connected successfully! 🎉');
                  onChange('whatsapp_phone_id', result.phone_number_id);
                  onChange('whatsapp_waba_id', result.waba_id);
                  onChange('whatsapp_access_token', 'connected');
                }
                setConnecting(false);
              })
              .catch(() => {
                toast.error('Connection failed. Try manual entry below.');
                setShowManual(true);
                setConnecting(false);
              });
          } else {
            if (response.status !== 'unknown') {
              toast.error('Login cancelled or failed. Try manual entry below.');
              setShowManual(true);
            }
          }
        },
        {
          config_id: META_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { version: 'v4' },
        }
      );
    } catch {
      toast.error('Embedded Signup failed. Enter credentials manually below.');
      setShowManual(true);
      setWaitingForPopup(false);
      setConnecting(false);
    }
  };

  // ── Disconnect ──
  const handleDisconnect = async () => {
    if (!confirm('Are you sure? Your bot will stop responding to messages.')) return;
    setDisconnecting(true);
    try {
      const resp = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const result = await resp.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('WhatsApp disconnected');
        onChange('whatsapp_phone_id', '');
        onChange('whatsapp_waba_id', '');
        onChange('whatsapp_access_token', '');
      }
    } catch {
      toast.error('Failed to disconnect');
    }
    setDisconnecting(false);
  };

  // ── Manual Save (fallback) ──
  const handleSaveManual = async () => {
    setSaving(true);
    try {
      const resp = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.whatsapp_access_token || '',
          waba_id: data.whatsapp_waba_id || '',
          phone_number_id: data.whatsapp_phone_id || '',
        }),
      });
      const result = await resp.json();
      if (result.error) toast.error(result.error);
      else toast.success('WhatsApp configuration saved!');
    } catch {
      toast.error('Failed to save configuration');
    }
    setSaving(false);
  };

  // ── Load Profile ──
  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const resp = await fetch('/api/whatsapp/profile');
      const result = await resp.json();
      if (result.profile) {
        setProfile({
          about: result.profile.about || '',
          address: result.profile.address || '',
          description: result.profile.description || '',
          email: result.profile.email || '',
          vertical: result.profile.vertical || '',
          websites: (result.profile.websites || []).join(', '),
          profile_picture_url: result.profile.profile_picture_url || '',
        });
      }
    } catch {
      toast.error('Failed to load profile');
    }
    setLoadingProfile(false);
  };

  // ── Save Profile ──
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile_picture_url, ...editableProfile } = profile;
      const payload: Record<string, unknown> = { ...editableProfile };
      if (profile.websites) {
        payload.websites = profile.websites.split(',').map((w: string) => w.trim()).filter(Boolean);
      } else {
        payload.websites = [];
      }
      const resp = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (result.error) toast.error(result.error);
      else toast.success('WhatsApp profile updated!');
    } catch {
      toast.error('Failed to update profile');
    }
    setSavingProfile(false);
  };

  // ── Upload Profile Picture ──
  const handlePfpUpload = async (file: File) => {
    if (!file) return;
    // Validate file type and size (max 5MB, JPEG/PNG only)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPEG and PNG images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    setUploadingPfp(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/whatsapp/profile/picture', {
        method: 'POST',
        body: formData,
      });
      const result = await resp.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Profile picture updated!');
        // Refresh profile to get new URL
        loadProfile();
      }
    } catch {
      toast.error('Failed to upload profile picture.');
    }
    setUploadingPfp(false);
  };

  // ── Load Ice Breakers ──
  const loadIceBreakers = async () => {
    setLoadingIce(true);
    try {
      const resp = await fetch('/api/whatsapp/ice-breakers');
      const result = await resp.json();
      if (result.ice_breakers) {
        setIceBreakers(result.ice_breakers.map((ib: { question: string }) => ib.question));
      }
    } catch {
      toast.error('Failed to load ice breakers');
    }
    setLoadingIce(false);
  };

  // ── Save Ice Breakers ──
  const saveIceBreakers = async () => {
    setSavingIce(true);
    try {
      const resp = await fetch('/api/whatsapp/ice-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ice_breakers: iceBreakers.filter(Boolean).map((q) => ({ question: q })),
        }),
      });
      const result = await resp.json();
      if (result.error) toast.error(result.error);
      else toast.success(`Ice breakers saved! (${result.count} active)`);
    } catch {
      toast.error('Failed to save ice breakers');
    }
    setSavingIce(false);
  };

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        {isConnected ? (
          <>
            {/* Connected State */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp Connected</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your bot is live and responding to messages.
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all"
              >
                {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Disconnect
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Phone Number ID</p>
                <p className="text-sm font-mono mt-0.5">{data.whatsapp_phone_id?.slice(0, 6)}••••••</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">WABA ID</p>
                <p className="text-sm font-mono mt-0.5">{data.whatsapp_waba_id?.slice(0, 6)}••••••</p>
              </div>
            </div>
          </>
        ) : connecting ? (
          /* ── Rich Connecting Animation Overlay ── */
          <div className="py-6 px-2">
            <div className="text-center mb-8">
              {/* Animated WhatsApp icon with pulse ring */}
              <div className="relative mx-auto mb-4 h-16 w-16">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="absolute inset-1 rounded-full bg-emerald-500/10 animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/30">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Setting Up Your Bot
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                This usually takes 5-10 seconds
              </p>
            </div>

            {/* Progress Steps */}
            <div className="max-w-xs mx-auto space-y-3">
              {CONNECT_STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = connectStep === i;
                const isDone = connectStep > i;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500 ${
                      isActive
                        ? 'bg-primary/10 border border-primary/20 scale-[1.02]'
                        : isDone
                        ? 'bg-emerald-500/5 border border-emerald-500/10'
                        : 'opacity-30 border border-transparent'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500/20'
                        : isActive
                        ? 'bg-primary/20'
                        : 'bg-muted/30'
                    }`}>
                      {isDone ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : isActive ? (
                        <StepIcon className={`h-4 w-4 ${step.color} animate-pulse`} />
                      ) : (
                        <StepIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-500 ${
                      isDone ? 'text-emerald-500' : isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Animated progress bar */}
            <div className="max-w-xs mx-auto mt-6">
              <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(((connectStep + 1) / CONNECT_STEPS.length) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Fun fact while waiting */}
            <p className="text-center text-[11px] text-muted-foreground/60 mt-4 italic">
              💡 Tip: Your AI bot will automatically respond to customer messages once connected.
            </p>
          </div>
        ) : (
          <>
            {/* Disconnected State */}
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <MessageSquare className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold mb-1">Connect Your WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                One-click setup — no technical knowledge needed. Connect your restaurant&apos;s WhatsApp number.
              </p>
              <button
                onClick={handleConnect}
                disabled={waitingForPopup}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-wait transition-all"
              >
                {waitingForPopup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                {waitingForPopup ? 'Waiting for Facebook...' : 'Connect with WhatsApp'}
              </button>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>✓ Uses your existing number</span>
                <span>✓ 2 min setup</span>
              </div>
            </div>

            {/* Manual Entry Fallback */}
            <div className="mt-4 border-t border-border/50 pt-4">
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showManual ? '▾ Hide manual entry' : '▸ Advanced: Enter credentials manually'}
              </button>
              {showManual && (
                <div className="mt-3 space-y-3">
                  {[
                    { key: 'whatsapp_phone_id', label: 'Phone Number ID', placeholder: 'From Meta Business Suite' },
                    { key: 'whatsapp_waba_id', label: 'WABA ID', placeholder: 'WhatsApp Business Account ID' },
                    { key: 'whatsapp_access_token', label: 'Access Token', placeholder: 'Permanent access token' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium">{field.label}</label>
                      <input
                        type="password"
                        value={data[field.key] || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors font-mono"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleSaveManual}
                    disabled={saving}
                    className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save & Connect
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Webhook URL — always visible */}
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-primary font-medium">Webhook URL</p>
          <code className="mt-1 block text-xs text-muted-foreground break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/webhooks/whatsapp
          </code>
        </div>
      </div>

      {/* WhatsApp Business Profile — only when connected */}
      {isConnected && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">WhatsApp Business Profile</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                How your business appears to customers on WhatsApp.
              </p>
            </div>
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                if (!showProfile && !profileLoadedRef.current) {
                  profileLoadedRef.current = true;
                  loadProfile();
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-all"
            >
              {showProfile ? 'Hide' : 'Edit Profile'}
            </button>
          </div>
          {showProfile && (
            <div className="space-y-3">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Profile Picture */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border/50 shadow-lg bg-muted/30">
                        {profile.profile_picture_url ? (
                          <img
                            src={profile.profile_picture_url}
                            alt="WhatsApp profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      {/* Upload overlay */}
                      <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        {uploadingPfp ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePfpUpload(file);
                            e.target.value = '';
                          }}
                          disabled={uploadingPfp}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Profile Picture</p>
                      <p className="text-xs text-muted-foreground">Hover to change · JPEG/PNG, max 5MB</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">About <span className="text-muted-foreground">(tagline)</span></label>
                      <input
                        type="text"
                        value={profile.about}
                        onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                        placeholder="Best food in town!"
                        maxLength={139}
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                      <p className="text-[11px] text-muted-foreground text-right">{profile.about.length}/139</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="info@yourbusiness.com"
                        maxLength={128}
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                      <p className="text-[11px] text-muted-foreground text-right">{profile.email.length}/128</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Description <span className="text-muted-foreground">(max 512 chars)</span></label>
                    <textarea
                      value={profile.description}
                      onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                      placeholder="Tell customers about your restaurant, cuisine style, specialties..."
                      rows={3}
                      maxLength={512}
                      className="flex w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">{profile.description.length}/512</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Address</label>
                      <input
                        type="text"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        placeholder="123 Main St, Mumbai, Maharashtra"
                        maxLength={256}
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                      <p className="text-[11px] text-muted-foreground text-right">{profile.address.length}/256</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Business Category</label>
                      <select
                        value={profile.vertical}
                        onChange={(e) => setProfile({ ...profile, vertical: e.target.value })}
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      >
                        <option value="">Select category</option>
                        <option value="RESTAURANT">Restaurant</option>
                        <option value="GROCERY">Grocery</option>
                        <option value="RETAIL">Retail</option>
                        <option value="HOTEL">Hotel / Hospitality</option>
                        <option value="BEAUTY">Beauty & Spa</option>
                        <option value="APPAREL">Apparel / Fashion</option>
                        <option value="EDU">Education</option>
                        <option value="ENTERTAIN">Entertainment</option>
                        <option value="EVENT_PLAN">Event Planning</option>
                        <option value="FINANCE">Finance</option>
                        <option value="HEALTH">Health & Medical</option>
                        <option value="NONPROFIT">Non-Profit</option>
                        <option value="GOVT">Government</option>
                        <option value="PROF_SERVICES">Professional Services</option>
                        <option value="AUTO">Automotive</option>
                        <option value="TRAVEL">Travel & Tourism</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Websites & Social Links <span className="text-muted-foreground">(comma-separated, max 2)</span></label>
                    <input
                      type="text"
                      value={profile.websites}
                      onChange={(e) => setProfile({ ...profile, websites: e.target.value })}
                      placeholder="https://yourbusiness.com, https://instagram.com/yourbrand"
                      className="flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    />
                    <p className="text-[11px] text-muted-foreground">Add your website, Instagram, Facebook, or online ordering page. Meta shows these on your WhatsApp profile.</p>
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Profile
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ice Breakers — only when connected */}
      {isConnected && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">❄️ Ice Breakers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quick-tap questions shown when customers open your chat (max 4).
              </p>
            </div>
            <button
              onClick={() => {
                setShowIceBreakers(!showIceBreakers);
                if (!showIceBreakers && iceBreakers.length === 0) loadIceBreakers();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium hover:bg-muted transition-all"
            >
              {showIceBreakers ? 'Hide' : 'Configure'}
            </button>
          </div>
          {showIceBreakers && (
            <div className="space-y-3">
              {loadingIce ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {iceBreakers.map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const updated = [...iceBreakers];
                          updated[i] = e.target.value;
                          setIceBreakers(updated);
                        }}
                        maxLength={80}
                        placeholder="e.g., Show me the menu"
                        className="flex-1 h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                      <button
                        onClick={() => setIceBreakers(iceBreakers.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {iceBreakers.length < 4 && (
                    <button
                      onClick={() => setIceBreakers([...iceBreakers, ''])}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                    >
                      + Add ice breaker
                    </button>
                  )}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-medium text-primary mb-1.5">Suggested for restaurants:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['📋 Show me the menu', '🛒 Track my order', '⏰ What are your hours?', '📞 Talk to us'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            if (iceBreakers.length < 4 && !iceBreakers.includes(suggestion)) {
                              setIceBreakers([...iceBreakers, suggestion]);
                            }
                          }}
                          disabled={iceBreakers.length >= 4 || iceBreakers.includes(suggestion)}
                          className="inline-flex items-center rounded-full bg-card border border-border px-2.5 py-0.5 text-[11px] font-medium hover:border-primary/50 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={saveIceBreakers}
                    disabled={savingIce}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {savingIce ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Ice Breakers
                  </button>
                </>
              )}
            </div>
          )}

          {/* Bot Commands — info only */}
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="text-xs font-medium mb-2">🤖 Bot Commands (auto-handled)</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { cmd: 'menu', desc: 'Shows your menu' },
                { cmd: 'cart', desc: 'Customer cart' },
                { cmd: 'orders', desc: 'Order history' },
                { cmd: 'help', desc: 'Help message' },
              ].map((c) => (
                <span key={c.cmd} className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 border border-border px-2.5 py-1 text-[11px]">
                  <code className="font-mono font-semibold">{c.cmd}</code>
                  <span className="text-muted-foreground">→ {c.desc}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AISettings({
  data,
  onChange,
}: {
  data: RestaurantData;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-4">AI Bot Persona</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Persona</label>
          <textarea
            value={data.ai_persona || ""}
            onChange={(e) => onChange("ai_persona", e.target.value)}
            placeholder="Describe how the AI bot should behave..."
            rows={4}
            className="flex w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function PaymentSettings({ restaurantId }: { restaurantId: string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getRestaurantPaymentConfig(restaurantId);
      if (data && data.success) {
        setClientId(data.cashfree_client_id || "");
        setClientSecret(data.cashfree_client_secret || "");
        setWebhookSecret(data.cashfree_webhook_secret || "");
      }
      setLoading(false);
    })();
  }, [restaurantId]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateRestaurantPaymentConfig(restaurantId, {
      cashfree_client_id: clientId,
      cashfree_client_secret: clientSecret,
      cashfree_webhook_secret: webhookSecret,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment credentials saved successfully! 💳");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isProduction = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h3 className="text-base font-semibold">Payment Integration</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            isProduction ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
          }`}>
            {isProduction ? "Production Mode" : "Sandbox / Test Mode"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your restaurant&apos;s specific Cashfree merchant credentials to route customer payments directly to your account.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cashfree Client ID (App ID)</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g., CF123456C789"
              className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cashfree Client Secret (Secret Key)</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cashfree Webhook Secret Key</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              Required to verify payment success notifications reliably. Find this in Cashfree Dashboard → Developers → Webhook.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="text-base font-semibold mb-1 text-primary">💡 Verification Setup</h3>
        <p className="text-sm text-muted-foreground">
          In your Cashfree Dashboard under Webhooks, make sure to add the following notification URL for status sync:
        </p>
        <code className="mt-3 block rounded-lg bg-background p-3 text-xs font-mono text-muted-foreground break-all border border-border/50">
          {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/cashfree
        </code>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Payment Credentials
      </button>
    </div>
  );
}

function LanguageSettings({
  data,
  onChange,
}: {
  data: RestaurantData;
  onChange: (key: string, value: string[]) => void;
}) {
  const allLanguages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "mr", name: "Marathi" },
    { code: "bn", name: "Bengali" },
    { code: "kn", name: "Kannada" },
    { code: "ml", name: "Malayalam" },
    { code: "gu", name: "Gujarati" },
  ];

  const current: string[] = data.supported_languages || ["en"];

  const toggle = (code: string) => {
    const updated = current.includes(code)
      ? current.filter((c: string) => c !== code)
      : [...current, code];
    onChange("supported_languages", updated);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <h3 className="text-base font-semibold mb-4">Supported Languages</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {allLanguages.map((lang) => (
          <label
            key={lang.code}
            className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <input
              type="checkbox"
              checked={current.includes(lang.code)}
              onChange={() => toggle(lang.code)}
              className="rounded accent-primary"
            />
            <span className="text-sm font-medium">{lang.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function NotificationSettings({ restaurantId }: { restaurantId: string }) {
  const [email, setEmail] = useState("");
  const [toggles, setToggles] = useState({
    notify_new_order: true,
    notify_payment: true,
    notify_human_handoff: true,
    notify_daily_summary: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("notification_email, notify_new_order, notify_payment, notify_human_handoff, notify_daily_summary")
        .eq("id", restaurantId)
        .single();

      if (data) {
        const d = data as Record<string, unknown>;
        setEmail((d.notification_email as string) || "");
        setToggles({
          notify_new_order: d.notify_new_order !== false,
          notify_payment: d.notify_payment !== false,
          notify_human_handoff: d.notify_human_handoff !== false,
          notify_daily_summary: d.notify_daily_summary !== false,
        });
      }
      setLoading(false);
    })();
  }, [restaurantId]);

  const handleSave = async () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSaving(true);
    const result = await updateRestaurantSettings(restaurantId, {
      notification_email: email || null,
      ...toggles,
    });
    setSaving(false);
    if (result.error) {
      console.error("[NotificationSettings] Save failed:", result.error);
      toast.error(result.error);
    } else {
      toast.success("Notification preferences saved");
    }
  };

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const NOTIFICATION_OPTIONS = [
    { key: "notify_new_order" as const, label: "New Order Alert", desc: "Email when a new order is placed", icon: "🔔" },
    { key: "notify_payment" as const, label: "Payment Received", desc: "Email when a payment is confirmed", icon: "💰" },
    { key: "notify_human_handoff" as const, label: "Human Handoff", desc: "Email when AI transfers a customer to you", icon: "🤝" },
    { key: "notify_daily_summary" as const, label: "Daily Summary", desc: "End-of-day report with orders and revenue", icon: "📊" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Configuration */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">📧 Email Notifications</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Receive reliable email alerts for orders and business updates. Works even when WhatsApp&apos;s 24-hour window expires.
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Notification Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@restaurant.com"
            className="w-full rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to disable email notifications. WhatsApp notifications will still work within the 24-hour window.
          </p>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {NOTIFICATION_OPTIONS.map((n) => (
            <div key={n.key} className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-lg">{n.icon}</span>
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggles[n.key]}
                  onChange={() => handleToggle(n.key)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Real-time Info */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <h3 className="text-base font-semibold mb-1">🔊 Dashboard Sound Alerts</h3>
        <p className="text-sm text-muted-foreground">
          When you have the dashboard open, you&apos;ll automatically hear a chime notification and see a popup for every new order — no setup required.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Preferences
      </button>
    </div>
  );
}

function APISettings() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <h3 className="text-base font-semibold mb-1">API & Webhooks</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Configure POS integration and external webhook endpoints.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">POS Webhook URL</label>
          <input
            type="url"
            placeholder="https://your-pos-system.com/webhook"
            className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            New orders will be forwarded to this URL for POS integration.
          </p>
        </div>
      </div>
    </div>
  );
}

function DeliverySettings({
  data,
  onChange,
}: {
  data: RestaurantData;
  onChange: (key: string, value: string | boolean | string[]) => void;
}) {
  const rules = data.delivery_fee_rules || { flat_fee: 0, free_above: 0, enabled: false };
  const enabled = rules.enabled || false;
  const flatFeeRupees = ((rules.flat_fee || 0) / 100).toString();
  const freeAboveRupees = ((rules.free_above || 0) / 100).toString();
  const pickupEnabled = data.pickup_enabled ?? true;
  const deliveryEnabled = data.delivery_enabled ?? false;

  const updateRules = (field: string, value: string | boolean) => {
    const current = data.delivery_fee_rules || { flat_fee: 0, free_above: 0, enabled: false };
    let updated;

    if (field === "enabled") {
      updated = { ...current, enabled: value as boolean };
    } else if (field === "flat_fee") {
      const rupees = parseFloat(value as string) || 0;
      updated = { ...current, flat_fee: Math.round(rupees * 100) };
    } else if (field === "free_above") {
      const rupees = parseFloat(value as string) || 0;
      updated = { ...current, free_above: Math.round(rupees * 100) };
    } else {
      updated = current;
    }

    // We pass this as a string but the parent stores it as-is in formData
    onChange("delivery_fee_rules", updated as unknown as string);
  };

  return (
    <div className="space-y-6">
      {/* Order Types Available */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Order Types</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Choose how customers can receive their orders.
        </p>

        {/* Pickup Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 p-4 mb-3">
          <div>
            <p className="text-sm font-medium">🏪 Pickup / Takeaway</p>
            <p className="text-xs text-muted-foreground">
              Customers order online and pick up from your location
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pickupEnabled}
              onChange={(e) => onChange("pickup_enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        {/* Delivery Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
          <div>
            <p className="text-sm font-medium">🚗 Home Delivery</p>
            <p className="text-xs text-muted-foreground">
              Enable if you have your own delivery staff
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={(e) => onChange("delivery_enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        {/* Warning if both are off */}
        {!pickupEnabled && !deliveryEnabled && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 mt-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ At least one order type must be enabled for customers to place orders.
            </p>
          </div>
        )}

        {/* Info text */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mt-3">
          <p className="text-xs text-muted-foreground">
            {pickupEnabled && deliveryEnabled
              ? "📋 Customers will choose between Pickup and Delivery at checkout."
              : pickupEnabled
              ? "📋 All orders will be Pickup only. No delivery address will be asked."
              : deliveryEnabled
              ? "📋 All orders will require delivery address."
              : "📋 No order type is enabled. Customers cannot place orders."}
          </p>
        </div>
      </div>

      {/* Delivery Charges — only show when delivery is enabled */}
      {deliveryEnabled && (
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Delivery Charges</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Configure how delivery fees are applied to customer orders.
        </p>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 p-4 mb-5">
          <div>
            <p className="text-sm font-medium">Enable Delivery Charges</p>
            <p className="text-xs text-muted-foreground">
              When enabled, delivery fee will be added to all orders
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => updateRules("enabled", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        {enabled && (
          <div className="space-y-4">
            {/* Flat Fee */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Fee (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={flatFeeRupees}
                  onChange={(e) => updateRules("flat_fee", e.target.value)}
                  placeholder="e.g., 30"
                  className="flex h-10 w-full rounded-xl border border-input bg-muted/30 pl-8 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Flat delivery charge applied to each order
              </p>
            </div>

            {/* Free Delivery Threshold */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Free Delivery Above (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={freeAboveRupees}
                  onChange={(e) => updateRules("free_above", e.target.value)}
                  placeholder="e.g., 500"
                  className="flex h-10 w-full rounded-xl border border-input bg-muted/30 pl-8 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Orders above this amount get free delivery. Set to 0 to always charge.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mt-4">
              <p className="text-sm font-medium text-primary mb-2">📋 Preview</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  • Delivery fee: <span className="font-medium text-foreground">₹{flatFeeRupees}</span> per order
                </p>
                {parseInt(freeAboveRupees) > 0 && (
                  <p>
                    • Free delivery on orders above: <span className="font-medium text-foreground">₹{freeAboveRupees}</span>
                  </p>
                )}
                <p className="text-xs mt-2 italic">
                  Bot will automatically show &quot;🚚 Delivery: ₹{flatFeeRupees}&quot; in the cart summary
                </p>
              </div>
            </div>
          </div>
        )}

        {!enabled && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">
              Delivery charges are currently disabled. All orders will show ₹0 delivery fee.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Tax Rate */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Tax / GST</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Set the tax percentage applied to all orders. Set to 0 to disable tax.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tax Rate (%)</label>
          <div className="relative max-w-[200px]">
            <input
              type="number"
              min="0"
              max="28"
              step="0.5"
              value={((data.tax_rate as number) ?? 500) / 100}
              onChange={(e) => {
                const pct = parseFloat(e.target.value) || 0;
                onChange("tax_rate", Math.round(pct * 100) as unknown as string);
              }}
              placeholder="e.g., 5"
              className="flex h-10 w-full rounded-xl border border-input bg-muted/30 pl-4 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Standard GST for restaurants is 5%. Set to 0 to disable tax on orders.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Billing Section
// ============================================================

function BillingSection({ restaurantId }: { restaurantId: string }) {
  const [plan, setPlan] = useState<{ plan: string; plan_expires_at: string | null; trial_used: boolean; config: ReturnType<typeof import("@/lib/utils/plan-limits").getPlanConfig> } | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    (async () => {
      const [planData, usageData] = await Promise.all([
        getCurrentPlan(restaurantId),
        getPlanUsage(restaurantId),
      ]);
      setPlan(planData);
      setUsage(usageData);
      setLoading(false);

      // Check for payment return
      const params = new URLSearchParams(window.location.search);
      if (params.get("status") === "success" && params.get("order_id")) {
        const result = await verifyPlanPayment(restaurantId, params.get("order_id")!);
        if (result.success) {
          toast.success("Plan upgraded successfully! 🎉");
          window.history.replaceState({}, "", "/dashboard/settings?tab=billing");
          // Reload data
          const refreshed = await getCurrentPlan(restaurantId);
          setPlan(refreshed);
        } else if (result.error) {
          toast.error(result.error);
        }
      }
    })();
  }, [restaurantId]);

  const handleUpgrade = async (targetPlan: PlanSlug) => {
    if (targetPlan === "free") return;
    setUpgrading(targetPlan);

    const result = await createPlanCheckout(restaurantId, targetPlan, billingCycle);
    setUpgrading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.paymentSessionId) {
      // Use Cashfree JS SDK to open PG checkout
      try {
        const { load } = await import("@cashfreepayments/cashfree-js");
        const cashfree = await load({
          mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
        });
        const checkoutResult = await cashfree.checkout({
          paymentSessionId: result.paymentSessionId,
          redirectTarget: "_self",
        });
        if (checkoutResult.error) {
          toast.error(checkoutResult.error.message || "Payment failed");
        }
      } catch (sdkError) {
        console.error("[Billing] Cashfree SDK error:", sdkError);
        toast.error("Failed to load payment gateway. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlanSlug = (plan?.plan || "free") as PlanSlug;
  const currentConfig = plan?.config || PLANS.free;

  const usageItems = [
    { label: "Orders this month", used: usage.orders || 0, limit: currentConfig.orders, key: "orders" },
    { label: "Menu items", used: usage.items || 0, limit: currentConfig.items, key: "items" },
    { label: "Active coupons", used: usage.coupons || 0, limit: currentConfig.coupons, key: "coupons" },
    { label: "Active combos", used: usage.combos || 0, limit: currentConfig.combos, key: "combos" },
    { label: "Active rewards", used: usage.rewards || 0, limit: currentConfig.rewards, key: "rewards" },
    { label: "Campaigns this month", used: usage.campaigns || 0, limit: currentConfig.campaigns, key: "campaigns" },
    { label: "AI responses this month", used: usage.ai || 0, limit: currentConfig.ai, key: "ai" },
  ];

  const PLAN_COLORS: Record<PlanSlug, string> = {
    free: "border-border",
    starter: "border-blue-500/50",
    growth: "border-primary/50",
    enterprise: "border-purple-500/50",
  };

  const PLAN_BADGE_COLORS: Record<PlanSlug, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/10 text-blue-600",
    growth: "bg-primary/10 text-primary",
    enterprise: "bg-purple-500/10 text-purple-600",
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className={`rounded-2xl border-2 ${PLAN_COLORS[currentPlanSlug]} bg-card p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">{currentConfig.name} Plan</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${PLAN_BADGE_COLORS[currentPlanSlug]}`}>
                Current
              </span>
            </div>
            {plan?.plan_expires_at ? (
              <p className="text-sm text-muted-foreground">
                Renews on{" "}
                {new Date(plan.plan_expires_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentPlanSlug === "free" ? "Free forever — upgrade anytime" : "No expiry set"}
              </p>
            )}
          </div>
          {currentPlanSlug === "free" && !plan?.trial_used && (
            <button
              onClick={async () => {
                if (!restaurantId) return;
                const result = await startStarterTrial(restaurantId);
                if (result.error) {
                  toast.error(result.error as string);
                } else {
                  toast.success("🎉 14-day Starter trial activated!");
                  const refreshed = await getCurrentPlan(restaurantId);
                  setPlan(refreshed);
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Start 14-Day Trial
            </button>
          )}
          {currentPlanSlug !== "enterprise" && (
            <button
              onClick={() => {
                document.getElementById("plan-comparison")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              <ArrowUpRight className="h-4 w-4" />
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold">Current Usage</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {usageItems.map((item) => {
            const isUnlimited = item.limit === -1;
            const percentage = isUnlimited ? 0 : item.limit > 0 ? Math.min((item.used / item.limit) * 100, 100) : 0;
            const isNearLimit = percentage >= 80;

            return (
              <div key={item.key} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-mono font-semibold ${isNearLimit ? "text-amber-500" : "text-foreground"}`}>
                    {item.used} / {formatLimit(item.limit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUnlimited ? "bg-primary/30" : isNearLimit ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: isUnlimited ? "5%" : `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div id="plan-comparison" className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
            billingCycle === "annual" ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              billingCycle === "annual" ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingCycle === "annual" ? "text-foreground" : "text-muted-foreground"}`}>
          Annual
        </span>
        {billingCycle === "annual" && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Save up to 17%
          </span>
        )}
      </div>

      {/* Plan Comparison Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((slug) => {
          const cfg = PLANS[slug];
          const isCurrent = slug === currentPlanSlug;
          const price = billingCycle === "annual" ? cfg.annual : cfg.monthly;
          const savings = getAnnualSavings(slug);
          const currentIdx = PLAN_ORDER.indexOf(currentPlanSlug);
          const thisIdx = PLAN_ORDER.indexOf(slug);
          const isUpgrade = thisIdx > currentIdx;
          const isDowngrade = thisIdx < currentIdx;

          return (
            <div
              key={slug}
              className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${
                isCurrent
                  ? `${PLAN_COLORS[slug]} bg-card ring-2 ring-primary/20`
                  : "border-border/50 bg-card hover:border-border"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{cfg.name}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  {price === 0 ? (
                    <span className="text-2xl font-bold">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">₹{price.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">
                        /{billingCycle === "annual" ? "yr" : "mo"}
                      </span>
                    </div>
                  )}
                  {billingCycle === "annual" && savings > 0 && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      Save ₹{savings.toLocaleString()}/year
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 text-xs">
                {[
                  { label: `${formatLimit(cfg.orders)} orders/mo` },
                  { label: `${formatLimit(cfg.items)} menu items` },
                  { label: `${formatLimit(cfg.ai)} AI responses/mo` },
                  { label: `${formatLimit(cfg.campaigns)} campaigns/mo` },
                  { label: cfg.campaignContacts > 0 ? `${formatLimit(cfg.campaignContacts)} contacts/send` : null },
                  { label: `${formatLimit(cfg.coupons)} coupons` },
                  { label: `${formatLimit(cfg.combos)} combos` },
                  { label: `${formatLimit(cfg.rewards)} rewards` },
                  { label: `${cfg.team === 1 ? "1 team member" : `${formatLimit(cfg.team)} team members`}` },
                  { label: cfg.loyalty ? "Loyalty program" : null },
                  { label: cfg.payments ? "Online payments" : null },
                  { label: cfg.aiPersona ? (cfg.multiPersona ? "Multi AI personas" : "Custom AI persona") : null },
                  { label: `${cfg.languages === -1 ? "All" : cfg.languages} languages` },
                  { label: cfg.prioritySupport !== "none" ? `Priority support (${cfg.prioritySupport})` : null },
                ].filter((f) => f.label).map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <div className="h-10 flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-sm font-semibold text-primary">
                    Current Plan
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(slug)}
                    disabled={upgrading === slug}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {upgrading === slug ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    Upgrade
                  </button>
                ) : isDowngrade && slug !== "free" ? (
                  <button
                    disabled
                    className="w-full h-10 inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium text-muted-foreground cursor-not-allowed"
                  >
                    Contact Support
                  </button>
                ) : (
                  <div className="h-10" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        All plans include WhatsApp bot, order management, and customer management.
        Downgrade requests are processed within 24 hours.
      </p>
    </div>
  );
}
