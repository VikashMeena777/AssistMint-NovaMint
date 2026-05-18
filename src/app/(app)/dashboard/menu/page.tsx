"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  UtensilsCrossed,
  Leaf,
  Star,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMenuItems,
  getCategories,
  createCategory,
  createMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
} from "@/lib/actions/menu-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export default function MenuPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AnyData[]>([]);
  const [categories, setCategories] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    name: "",
    category_id: "",
    price: "",
    description: "",
    is_veg: true,
    is_bestseller: false,
  });
  const [newCategoryName, setNewCategoryName] = useState("");
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
    const [itemsResult, catsResult] = await Promise.all([
      getMenuItems(restaurantId),
      getCategories(restaurantId),
    ]);
    setItems(itemsResult.data || []);
    setCategories(catsResult.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const handleAddCategory = async () => {
    if (!restaurantId || !newCategoryName.trim()) return;
    setSaving(true);
    const result = await createCategory(restaurantId, { name: newCategoryName.trim() });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Category created!");
      setNewCategoryName("");
      setShowAddCategory(false);
      loadData();
    }
  };

  const handleAddItem = async () => {
    if (!restaurantId || !newItem.name || !newItem.category_id || !newItem.price) {
      toast.error("Fill in name, category, and price.");
      return;
    }
    setSaving(true);

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const ext = imageFile.name.split(".").pop();
        const fileName = `${restaurantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
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

    const result = await createMenuItem(restaurantId, {
      category_id: newItem.category_id,
      name: newItem.name,
      description: newItem.description || undefined,
      price: Math.round(parseFloat(newItem.price) * 100), // Convert to paise
      image_url: imageUrl,
      is_veg: newItem.is_veg,
      is_bestseller: newItem.is_bestseller,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Menu item added!");
      setNewItem({ name: "", category_id: "", price: "", description: "", is_veg: true, is_bestseller: false });
      setImageFile(null);
      setImagePreview(null);
      setShowAddItem(false);
      loadData();
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!restaurantId) return;
    const result = await deleteMenuItem(restaurantId, itemId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Item deleted");
      loadData();
    }
  };

  const handleToggle = async (itemId: string, currentAvail: boolean) => {
    if (!restaurantId) return;
    const result = await toggleItemAvailability(restaurantId, itemId, !currentAvail);
    if (result.error) toast.error(result.error as string);
    else {
      toast.success(currentAvail ? "Item marked unavailable" : "Item marked available");
      loadData();
    }
  };

  // Filter items
  const filtered = items.filter((item) => {
    if (filter === "Veg" && !item.is_veg) return false;
    if (filter === "Non-Veg" && item.is_veg) return false;
    if (filter === "Bestsellers" && !item.is_bestseller) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Manage your menu categories, items, variants, and add-ons.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            Category
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["All", "Veg", "Non-Veg", "Bestsellers"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition-colors ${
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">New Category</h3>
            <button onClick={() => setShowAddCategory(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Starters, Main Course, Beverages"
              className="flex h-10 flex-1 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleAddCategory}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>
      )}

      {/* Add Item Form */}
      {showAddItem && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Add Menu Item</h3>
            <button onClick={() => setShowAddItem(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              placeholder="Item Name"
              className="flex h-10 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select
              value={newItem.category_id}
              onChange={(e) => setNewItem((p) => ({ ...p, category_id: e.target.value }))}
              className="flex h-10 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
              placeholder="Price (₹)"
              className="flex h-10 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              value={newItem.description}
              onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              className="flex h-10 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newItem.is_veg} onChange={(e) => setNewItem((p) => ({ ...p, is_veg: e.target.checked }))} className="accent-primary" />
              <Leaf className="h-3.5 w-3.5 text-green-600" /> Veg
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newItem.is_bestseller} onChange={(e) => setNewItem((p) => ({ ...p, is_bestseller: e.target.checked }))} className="accent-primary" />
              <Star className="h-3.5 w-3.5 text-amber-500" /> Bestseller
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer border border-dashed border-primary/40 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
              <ImagePlus className="h-4 w-4 text-primary" />
              <span className="text-primary">{imageFile ? imageFile.name.substring(0, 20) : 'Add Photo'}</span>
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
          <button
            onClick={handleAddItem}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to Menu
          </button>
        </div>
      )}

      {/* Menu Items */}
      <div className="rounded-2xl border border-border/50 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <UtensilsCrossed className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No menu items yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Start building your menu by adding categories and items.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 hover:bg-muted/20 transition-colors ${!item.is_available ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-10 w-10 rounded-xl object-cover shrink-0 border border-border/50"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/30 shrink-0 text-lg">
                      {item.is_veg ? "🟢" : "🔴"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      {item.is_bestseller && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                      {!item.image_url && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.is_veg ? "🟢" : "🔴"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.menu_categories?.name || "Uncategorized"} · ₹{(item.price / 100).toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(item.id, item.is_available)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title={item.is_available ? "Mark unavailable" : "Mark available"}
                  >
                    {item.is_available ? (
                      <ToggleRight className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
