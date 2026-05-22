"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  ImagePlus,
  Check,
  RefreshCw,
  BadgePercent,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCombos,
  createCombo,
  deleteCombo,
  toggleComboActive,
} from "@/lib/actions/combo-actions";
import { getMenuItems, getCategories } from "@/lib/actions/menu-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export default function CombosPage() {
  const [combos, setCombos] = useState<AnyData[]>([]);
  const [menuItems, setMenuItems] = useState<AnyData[]>([]);
  const [categories, setCategories] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    combo_price: "",
  });
  const [selectedItems, setSelectedItems] = useState<Map<string, { name: string; price: number; quantity: number }>>(new Map());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await getCurrentRestaurant();
      if (r?.id) setRestaurantId(r.id as string);
      else setLoading(false);
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [combosRes, menuRes, catsRes] = await Promise.all([
      getCombos(restaurantId),
      getMenuItems(restaurantId),
      getCategories(restaurantId),
    ]);
    setCombos(combosRes.data || []);
    setMenuItems(menuRes.data || []);
    setCategories(catsRes.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const originalPrice = Array.from(selectedItems.values()).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const comboPriceNum = form.combo_price ? parseFloat(form.combo_price) * 100 : 0;
  const savings = originalPrice > 0 && comboPriceNum > 0
    ? Math.round(((originalPrice - comboPriceNum) / originalPrice) * 100)
    : 0;

  const toggleItem = (item: AnyData) => {
    const newMap = new Map(selectedItems);
    if (newMap.has(item.id)) {
      newMap.delete(item.id);
    } else {
      newMap.set(item.id, { name: item.name, price: item.price, quantity: 1 });
    }
    setSelectedItems(newMap);
  };

  const handleCreate = async () => {
    if (!restaurantId) return;
    if (!form.name.trim()) { toast.error("Enter combo name."); return; }
    if (selectedItems.size < 2) { toast.error("Select at least 2 items."); return; }
    if (!form.combo_price || parseFloat(form.combo_price) <= 0) { toast.error("Enter combo price."); return; }
    if (comboPriceNum >= originalPrice) { toast.error("Combo price must be less than original total."); return; }

    setSaving(true);

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        const { createClient: createBrowserSupabase } = await import("@/lib/supabase/client");
        const supabase = createBrowserSupabase();
        const ext = imageFile.name.split(".").pop();
        const fileName = `${restaurantId}/combos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("menu-images")
          .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          toast.error("Image upload failed: " + uploadError.message);
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("menu-images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } catch (e) {
        console.error("Image upload error:", e);
        toast.error("Image upload failed.");
        setSaving(false);
        return;
      }
    }

    const comboItems = Array.from(selectedItems.entries()).map(([id, item]) => ({
      item_id: id,
      name: item.name,
      quantity: item.quantity,
    }));

    const result = await createCombo(restaurantId, {
      name: form.name,
      description: form.description || undefined,
      image_url: imageUrl,
      combo_items: comboItems,
      original_price: originalPrice,
      combo_price: comboPriceNum,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Combo "${form.name}" created!`);
      setForm({ name: "", description: "", combo_price: "" });
      setSelectedItems(new Map());
      setImageFile(null);
      setImagePreview(null);
      setShowCreate(false);
      loadData();
    }
  };

  const handleDelete = async (comboId: string, name: string) => {
    if (!restaurantId) return;
    if (!confirm(`Delete combo "${name}"?`)) return;
    const result = await deleteCombo(restaurantId, comboId);
    if (result.error) toast.error(result.error as string);
    else { toast.success("Combo deleted"); loadData(); }
  };

  const handleToggle = async (comboId: string, currentActive: boolean) => {
    if (!restaurantId) return;
    const result = await toggleComboActive(restaurantId, comboId, !currentActive);
    if (result.error) toast.error(result.error as string);
    else { toast.success(currentActive ? "Combo deactivated" : "Combo activated"); loadData(); }
  };

  // Group menu items by category
  const itemsByCategory: (AnyData & { items: AnyData[] })[] = categories.map((cat) => ({
    ...cat,
    items: menuItems.filter((item) => item.category_id === cat.id),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combos</h1>
          <p className="text-sm text-muted-foreground">
            Bundle menu items together with a special price to boost average order value.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Combo
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Create Combo</h3>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left: Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combo Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Family Feast"
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combo Price (₹)</label>
                  <input
                    type="number"
                    value={form.combo_price}
                    onChange={(e) => setForm((p) => ({ ...p, combo_price: e.target.value }))}
                    placeholder="e.g., 399"
                    min="0"
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., 2 Biryanis + 2 Drinks + 1 Dessert"
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Image Upload */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer border border-dashed border-primary/40 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <ImagePlus className="h-4 w-4 text-primary" />
                  <span className="text-primary text-xs font-semibold">
                    {imageFile ? imageFile.name.substring(0, 20) : "Add Combo Photo"}
                  </span>
                </label>
                {imagePreview && (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Price Summary */}
              {selectedItems.size > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Original total ({selectedItems.size} items)</span>
                    <span className="line-through">₹{(originalPrice / 100).toFixed(0)}</span>
                  </div>
                  {comboPriceNum > 0 && (
                    <>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Combo price</span>
                        <span className="text-primary">₹{(comboPriceNum / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Customer saves</span>
                        <span className={`font-bold ${savings > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {savings > 0 ? `${savings}% off` : "Price must be lower"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right: Item Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Items ({selectedItems.size} selected)
              </label>
              <div className="rounded-xl border border-border/50 bg-card max-h-[350px] overflow-y-auto">
                {itemsByCategory.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No menu items. Add items in the Menu page first.
                  </div>
                ) : (
                  itemsByCategory.map((cat) => (
                    <div key={cat.id}>
                      <div className="sticky top-0 bg-muted/50 backdrop-blur-sm px-4 py-2 border-b border-border/30">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cat.name}</p>
                      </div>
                      {cat.items.map((item: AnyData) => {
                        const isSelected = selectedItems.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItem(item)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors border-b border-border/20 ${
                              isSelected ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                                isSelected ? "bg-primary border-primary" : "border-border"
                              }`}>
                                {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </div>
                              <span className={`h-1.5 w-1.5 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">₹{(item.price / 100).toFixed(0)}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Combo
            </button>
          </div>
        </div>
      )}

      {/* Combos Grid */}
      <div className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : combos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Package className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No combos yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Bundle menu items together at a special price. Combos increase average order value and delight customers.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Your First Combo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {combos.map((combo) => {
              const comboSavings = combo.original_price > 0
                ? Math.round(((combo.original_price - combo.combo_price) / combo.original_price) * 100)
                : 0;
              const items = (combo.combo_items as Array<{ name: string; quantity: number }>) || [];

              return (
                <div
                  key={combo.id}
                  className={`rounded-2xl border bg-card overflow-hidden transition-all ${
                    combo.is_active ? "border-border/50" : "border-border/30 opacity-60"
                  }`}
                >
                  {/* Image */}
                  {combo.image_url ? (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={combo.image_url}
                        alt={combo.name}
                        className="w-full h-full object-cover"
                      />
                      {comboSavings > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                          <BadgePercent className="h-3 w-3" />
                          {comboSavings}% OFF
                        </div>
                      )}
                      {!combo.is_active && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-xs font-semibold uppercase px-3 py-1 rounded-full border border-white/20 bg-black/40">
                            Inactive
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-44 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/30">
                      <Package className="h-10 w-10 text-primary/40 mb-2" />
                      <span className="text-xs text-muted-foreground">No image</span>
                      {comboSavings > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                          <BadgePercent className="h-3 w-3" />
                          {comboSavings}% OFF
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-foreground">{combo.name}</h3>

                    {combo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{combo.description}</p>
                    )}

                    {/* Items List */}
                    <div className="space-y-1">
                      {items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-primary/40" />
                          {item.name} {item.quantity > 1 && `×${item.quantity}`}
                        </div>
                      ))}
                      {items.length > 4 && (
                        <p className="text-[10px] text-muted-foreground/60">+{items.length - 4} more items</p>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-2 border-t border-border/40">
                      <span className="text-lg font-bold text-primary font-mono">
                        ₹{(combo.combo_price / 100).toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through font-mono">
                        ₹{(combo.original_price / 100).toFixed(0)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggle(combo.id, combo.is_active)}
                        className={`inline-flex h-9 px-3 items-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          combo.is_active
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {combo.is_active ? (
                          <><ToggleRight className="h-4 w-4" /> Active</>
                        ) : (
                          <><ToggleLeft className="h-4 w-4" /> Inactive</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(combo.id, combo.name)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
