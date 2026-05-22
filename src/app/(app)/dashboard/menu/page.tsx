"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.8, 0.25, 1] } },
};
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
  Pencil,
  Clock,
  Flame,
  Sparkles,
  ChefHat,
  TrendingUp,
  Heart,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { updateMenuItem } from "@/lib/actions/menu-actions";

const AVAILABLE_TAGS = [
  { value: 'bestseller', label: 'Bestseller', icon: Star, color: 'text-amber-500' },
  { value: 'spicy', label: 'Spicy', icon: Flame, color: 'text-red-500' },
  { value: 'new', label: 'New', icon: Sparkles, color: 'text-blue-500' },
  { value: 'chefs_special', label: "Chef's Special", icon: ChefHat, color: 'text-purple-500' },
  { value: 'popular', label: 'Popular', icon: TrendingUp, color: 'text-emerald-500' },
  { value: 'must_try', label: 'Must Try', icon: Heart, color: 'text-pink-500' },
] as const;
import {
  getMenuItems,
  getCategories,
  createCategory,
  createMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  deleteCategory,
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  // New item form state
  const [newItem, setNewItem] = useState({
    name: "",
    category_id: "",
    price: "",
    description: "",
    is_veg: true,
    is_bestseller: false,
    tags: [] as string[],
    prep_time_minutes: "15",
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

  const handleDeleteCategory = async (catId: string) => {
    if (!restaurantId) return;
    if (!confirm("Are you sure? This will delete the category and all items inside it!")) return;
    setSaving(true);
    const result = await deleteCategory(restaurantId, catId);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Category deleted!");
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
        const { createClient: createBrowserSupabase } = await import("@/lib/supabase/client");
        const supabase = createBrowserSupabase();
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

    // Build tags array — include is_bestseller for backward compat
    const tags = [...newItem.tags];
    const isBestseller = newItem.is_bestseller || tags.includes('bestseller');

    const result = await createMenuItem(restaurantId, {
      category_id: newItem.category_id,
      name: newItem.name,
      description: newItem.description || undefined,
      price: Math.round(parseFloat(newItem.price) * 100),
      image_url: imageUrl,
      is_veg: newItem.is_veg,
      is_bestseller: isBestseller,
      prep_time_minutes: parseInt(newItem.prep_time_minutes) || 15,
      tags,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Menu item added!");
      setNewItem({ name: "", category_id: "", price: "", description: "", is_veg: true, is_bestseller: false, tags: [], prep_time_minutes: "15" });
      setImageFile(null);
      setImagePreview(null);
      setShowAddItem(false);
      loadData();
    }
  };

  const handleInlineEdit = async (itemId: string, updates: Record<string, unknown>) => {
    if (!restaurantId) return;
    setSaving(true);
    const result = await updateMenuItem(restaurantId, itemId, updates);
    setSaving(false);
    if (result.error) toast.error(result.error as string);
    else {
      toast.success("Item updated!");
      setEditingItemId(null);
      setEditValues({});
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

      {/* Categories Management Bar — always visible */}
      {!loading && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Categories</h3>
            {!showAddCategory && (
              <button
                onClick={() => setShowAddCategory(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {/* Inline Add Category Form */}
          {showAddCategory && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Starters, Main Course, Beverages"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                className="flex h-9 flex-1 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleAddCategory}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </button>
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Category Chips */}
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex items-center gap-2 bg-muted/50 border border-border/60 pl-3 pr-2 py-1.5 rounded-xl text-xs hover:border-red-300 transition-colors"
                >
                  <span className="font-medium text-foreground">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={saving}
                    className="flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title={`Delete "${cat.name}" category`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No categories yet. Add one to start organizing your menu.
            </p>
          )}
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
            <div className="flex gap-2">
              <input
                type="number"
                value={newItem.prep_time_minutes}
                onChange={(e) => setNewItem((p) => ({ ...p, prep_time_minutes: e.target.value }))}
                placeholder="Prep time (mins)"
                min="1"
                max="120"
                className="flex h-10 flex-1 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex h-10 items-center gap-1 rounded-xl border border-input bg-card px-3 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                mins
              </div>
            </div>
            <input
              type="text"
              value={newItem.description}
              onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              className="flex h-10 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 sm:col-span-2"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = newItem.tags.includes(tag.value) || (tag.value === 'bestseller' && newItem.is_bestseller);
                const Icon = tag.icon;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => {
                      if (tag.value === 'bestseller') {
                        setNewItem(p => ({ ...p, is_bestseller: !p.is_bestseller }));
                      } else {
                        setNewItem(p => ({
                          ...p,
                          tags: p.tags.includes(tag.value)
                            ? p.tags.filter(t => t !== tag.value)
                            : [...p.tags, tag.value],
                        }));
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary/15 border-primary/40 text-primary border ring-1 ring-primary/20'
                        : 'bg-card border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${isSelected ? tag.color : ''}`} />
                    {tag.label}
                    {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newItem.is_veg} onChange={(e) => setNewItem((p) => ({ ...p, is_veg: e.target.checked }))} className="accent-primary" />
              <Leaf className="h-3.5 w-3.5 text-green-600" /> Veg
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
      <div className="w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                <div className="h-40 rounded-xl bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded-lg bg-muted animate-pulse" />
                  <div className="h-5 w-32 rounded-lg bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded-lg bg-muted animate-pulse" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="h-5 w-14 rounded-lg bg-muted animate-pulse" />
                  <div className="h-8 w-20 rounded-xl bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <UtensilsCrossed className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No menu items yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Start building your menu by adding categories and items.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                layout
                className={`glass glass-interactive rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  !item.is_available ? "opacity-60 bg-muted/20 border-dashed" : ""
                }`}
              >
                {/* Header Content */}
                <div>
                  {/* Image / Placeholder */}
                  {item.image_url ? (
                    <div className="relative group overflow-hidden rounded-xl border border-border/50 mb-4 h-40">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-xs font-semibold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/20">
                            Unavailable
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`relative rounded-xl mb-4 h-40 flex flex-col items-center justify-center border border-border/40 ${
                      item.is_veg 
                        ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10" 
                        : "bg-gradient-to-br from-red-500/10 to-orange-500/5 dark:from-red-500/20 dark:to-orange-500/10"
                    }`}>
                      <div className="text-4xl filter drop-shadow-md mb-2">
                        {item.is_veg ? "🌿" : "🍖"}
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        item.is_veg 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      }`}>
                        {item.is_veg ? "Veg" : "Non-Veg"}
                      </span>
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center rounded-xl">
                          <span className="text-white text-xs font-semibold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/20">
                            Unavailable
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title & Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {item.menu_categories?.name || "Uncategorized"}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.is_veg ? (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Veg" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-red-500" title="Non-Veg" />
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-foreground line-clamp-1">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                        {item.description}
                      </p>
                    )}

                    {/* Tag pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.is_bestseller && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                          <Star className="h-2.5 w-2.5 fill-current" /> Bestseller
                        </span>
                      )}
                      {(item.tags as string[] || []).filter((t: string) => t !== 'bestseller').map((tag: string) => {
                        const tagDef = AVAILABLE_TAGS.find(t => t.value === tag);
                        if (!tagDef) return null;
                        const Icon = tagDef.icon;
                        return (
                          <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                            <Icon className={`h-2.5 w-2.5 ${tagDef.color}`} /> {tagDef.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Content & Actions */}
                <div className="mt-5 pt-4 border-t border-border/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-foreground font-mono">
                      ₹{(item.price / 100).toFixed(0)}
                    </div>
                    {item.prep_time_minutes && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30 font-mono">
                        <Clock className="h-3 w-3 text-primary" />
                        <span>{item.prep_time_minutes} min</span>
                      </div>
                    )}
                  </div>

                  {/* Inline editor when editing */}
                  {editingItemId === item.id ? (
                    <div className="space-y-3 p-3 bg-muted/45 rounded-xl border border-border/40 animate-slide-up">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Prep Time (Minutes)
                        </label>
                        <input
                          type="number"
                          defaultValue={item.prep_time_minutes || 15}
                          min="1"
                          max="120"
                          onChange={(e) => setEditValues(v => ({ ...v, prep_time_minutes: parseInt(e.target.value) }))}
                          className="h-8 w-full rounded-lg border border-input bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tags</label>
                        <div className="flex flex-wrap gap-1">
                          {AVAILABLE_TAGS.map(tag => {
                            const currentTags: string[] = (editValues.tags as string[]) ?? (item.tags as string[] || []);
                            const isActive = tag.value === 'bestseller'
                              ? (editValues.is_bestseller !== undefined ? editValues.is_bestseller as boolean : item.is_bestseller)
                              : currentTags.includes(tag.value);
                            const Icon = tag.icon;
                            return (
                              <button
                                key={tag.value}
                                type="button"
                                onClick={() => {
                                  if (tag.value === 'bestseller') {
                                    setEditValues(v => ({ ...v, is_bestseller: !isActive }));
                                  } else {
                                    const newTags = isActive
                                      ? currentTags.filter(t => t !== tag.value)
                                      : [...currentTags, tag.value];
                                    setEditValues(v => ({ ...v, tags: newTags }));
                                  }
                                }}
                                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-semibold transition-all ${
                                  isActive ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-card border border-border text-muted-foreground'
                                }`}
                              >
                                <Icon className={`h-2.5 w-2.5 ${isActive ? tag.color : ''}`} />
                                {tag.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleInlineEdit(item.id, editValues)}
                          disabled={saving}
                          className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingItemId(null); setEditValues({}); }}
                          className="flex-1 inline-flex h-8 items-center justify-center rounded-lg border border-border text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => { setEditingItemId(item.id); setEditValues({}); }}
                        className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border hover:bg-muted hover:text-foreground text-muted-foreground text-xs font-semibold transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Quick Edit
                      </button>
                      <button
                        onClick={() => handleToggle(item.id, item.is_available)}
                        className={`inline-flex h-9 px-3 items-center justify-center rounded-xl border transition-all ${
                          item.is_available 
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" 
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                        title={item.is_available ? "Mark unavailable" : "Mark available"}
                      >
                        {item.is_available ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
