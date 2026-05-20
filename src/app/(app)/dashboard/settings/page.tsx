"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentRestaurant,
  updateRestaurantSettings,
  updateWhatsAppConfig,
  setupWhatsAppIceBreakers,
} from "@/lib/actions/restaurant-actions";

const SETTINGS_TABS = [
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
  const [activeTab, setActiveTab] = useState<string>("restaurant");
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

  const handleSave = useCallback(async () => {
    if (!restaurant?.id) {
      toast.error("No restaurant found. Complete onboarding first.");
      return;
    }
    setSaving(true);
    const result = await updateRestaurantSettings(restaurant.id, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved successfully! 🌿");
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
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
          {activeTab === "payments" && <PaymentSettings />}
          {activeTab === "language" && (
            <LanguageSettings data={formData} onChange={handleChange} />
          )}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "api" && <APISettings />}
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
  onChange: (key: string, value: string) => void;
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

  return (
    <div className="space-y-6">
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
  const [settingUpIce, setSettingUpIce] = useState(false);
  const [iceManagerUrl, setIceManagerUrl] = useState("");
  const [iceSteps, setIceSteps] = useState<string[] | null>(null);

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    const result = await updateWhatsAppConfig(restaurantId, {
      whatsapp_phone_id: data.whatsapp_phone_id || "",
      whatsapp_token: data.whatsapp_access_token || "",
      whatsapp_business_id: data.whatsapp_waba_id || "",
    });
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("WhatsApp configuration saved!");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">WhatsApp Business API</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your WhatsApp Business account to enable the AI chatbot.
        </p>
        <div className="space-y-4">
          {[
            { key: "whatsapp_phone_id", label: "Phone Number ID", placeholder: "From Meta Business Suite" },
            { key: "whatsapp_waba_id", label: "WABA ID", placeholder: "WhatsApp Business Account ID" },
            { key: "whatsapp_access_token", label: "Access Token", placeholder: "Permanent access token" },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">{field.label}</label>
              <input
                type="password"
                value={data[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="flex h-10 w-full rounded-xl border border-input bg-muted/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSaveWhatsApp}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save WhatsApp Config
          </button>
        </div>
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-primary font-medium">Webhook URL</p>
          <code className="mt-1 block text-xs text-muted-foreground break-all">
            {typeof window !== "undefined"
              ? window.location.origin
              : "https://your-domain.com"}
            /api/webhooks/whatsapp
          </code>
        </div>

        {/* Ice Breakers */}
        <div className="mt-4 rounded-xl border border-border/50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium">Quick Actions (Ice Breakers)</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Clickable prompts shown when a customer opens your chat for the first time.
              </p>
              {settingUpIce && iceSteps && (
                <div className="space-y-2 mt-2">
                  <a
                    href={iceManagerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all"
                  >
                    Open WhatsApp Manager →
                  </a>
                  <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                    {iceSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mt-2">
                    <p className="text-xs font-medium text-primary mb-1">Recommended Ice Breakers:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Browse Menu", "View Cart", "Track Order", "Talk to Us"].map((t) => (
                        <span key={t} className="inline-flex items-center rounded-full bg-card border border-border px-2.5 py-0.5 text-[11px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                if (settingUpIce) {
                  setSettingUpIce(false);
                  return;
                }
                const result = await setupWhatsAppIceBreakers(restaurantId) as Record<string, unknown>;
                if (result.error) {
                  toast.error(result.error as string);
                } else {
                  setIceManagerUrl(result.managerUrl as string);
                  setIceSteps(result.steps as string[]);
                  setSettingUpIce(true);
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-all shrink-0"
            >
              {settingUpIce ? "Hide" : "Setup Guide"}
            </button>
          </div>
        </div>
      </div>
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

function PaymentSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Payment Integration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Payments are managed via your Cashfree dashboard. Configure your{" "}
          environment variables for integration.
        </p>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <p className="text-sm text-muted-foreground">
            Payment credentials are configured via server environment variables
            for security. Contact your admin to update CASHFREE_CLIENT_ID and
            CASHFREE_CLIENT_SECRET.
          </p>
        </div>
      </div>
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

function NotificationSettings() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <h3 className="text-base font-semibold mb-4">Notification Preferences</h3>
      <div className="space-y-4">
        {[
          { label: "New Order Alert", desc: "Get notified when a new order is placed" },
          { label: "Payment Received", desc: "Alert when a payment is confirmed" },
          { label: "Human Handoff", desc: "When AI transfers a customer to you" },
          { label: "Daily Summary", desc: "End-of-day report with orders and revenue" },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
            <div>
              <p className="text-sm font-medium">{n.label}</p>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        ))}
      </div>
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
