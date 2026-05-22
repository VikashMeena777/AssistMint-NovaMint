"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Users,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { getFeedbackStats, getRecentFeedback } from "@/lib/actions/feedback-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const RATING_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  5: { label: "Excellent", emoji: "🤩", color: "text-emerald-500" },
  4: { label: "Good", emoji: "😊", color: "text-emerald-400" },
  3: { label: "Okay", emoji: "😐", color: "text-amber-500" },
  2: { label: "Poor", emoji: "😕", color: "text-orange-500" },
  1: { label: "Bad", emoji: "😠", color: "text-red-500" },
};

function FeedbackSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/40" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-border/40 space-y-3">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-primary/20" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted/40" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/20" />
        </div>
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/60" />
          {[...Array(4)].map((_, j) => (
            <div key={j} className="h-14 animate-pulse rounded-xl bg-muted/25" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnyData>({});
  const [reviews, setReviews] = useState<AnyData[]>([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

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
    const [s, r] = await Promise.all([
      getFeedbackStats(restaurantId),
      getRecentFeedback(restaurantId, { ratingFilter, limit: 50 }),
    ]);
    setStats(s);
    setReviews(r.data || []);
    setLoading(false);
  }, [restaurantId, ratingFilter]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const maxDistribution = Math.max(
    ...Object.values(stats.distribution || { 1: 0 }).map(Number),
    1
  );

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FeedbackSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold tracking-tight">Customer Feedback</h1>
            <p className="text-sm text-muted-foreground">
              Ratings and reviews from your customers across all delivered orders.
            </p>
          </motion.div>

          {/* KPI Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {/* Average Rating */}
            <div className="glass glass-interactive rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold font-mono tracking-tight">
                {stats.avgRating || "0"}
              </p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono">{stats.totalRatings || 0}</span> total ratings
              </p>
            </div>

            {/* Positive Rate */}
            <div className="glass glass-interactive rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <ThumbsUp className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold font-mono tracking-tight text-emerald-500">
                {stats.positivePercent || 0}%
              </p>
              <p className="text-sm text-muted-foreground">Positive (4-5★)</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono text-red-400">{stats.negativePercent || 0}%</span> negative
              </p>
            </div>

            {/* Response Rate */}
            <div className="glass glass-interactive rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold font-mono tracking-tight">
                {stats.responseRate || 0}%
              </p>
              <p className="text-sm text-muted-foreground">Response Rate</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono">{stats.totalRatings || 0}</span> of{" "}
                <span className="font-mono">{stats.totalDelivered || 0}</span> orders
              </p>
            </div>

            {/* Total Delivered */}
            <div className="glass glass-interactive rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold font-mono tracking-tight">
                {stats.totalDelivered || 0}
              </p>
              <p className="text-sm text-muted-foreground">Delivered Orders</p>
              <p className="text-xs text-muted-foreground mt-1">Eligible for feedback</p>
            </div>
          </motion.div>

          {/* Rating Distribution + Filter */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            {/* Rating Distribution Chart */}
            <div className="glass rounded-2xl p-6 border border-border/40">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Rating Distribution</h3>
              </div>
              {(stats.totalRatings || 0) > 0 ? (
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const count = stats.distribution?.[r] || 0;
                    const pct = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
                    const info = RATING_LABELS[r];
                    return (
                      <button
                        key={r}
                        onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)}
                        className={`flex items-center gap-3 w-full text-left rounded-xl p-2 transition-all ${
                          ratingFilter === r
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/30 border border-transparent"
                        }`}
                      >
                        <span className="text-sm font-mono font-bold w-6 text-right">{r}</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              r >= 4
                                ? "bg-emerald-500"
                                : r === 3
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold text-muted-foreground w-8 text-right">
                          {count}
                        </span>
                        <span className="text-sm">{info.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl bg-muted/10 border border-dashed border-border/30">
                  <div className="text-center">
                    <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No ratings yet. Ratings appear after delivered orders.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Big Rating Card */}
            <div className="glass rounded-2xl p-6 border border-border/40 flex flex-col items-center justify-center text-center">
              {(stats.totalRatings || 0) > 0 ? (
                <>
                  <div className="text-7xl font-extrabold font-mono tracking-tight text-foreground">
                    {stats.avgRating}
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-6 w-6 ${
                          s <= Math.round(stats.avgRating || 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Based on <span className="font-mono font-bold text-foreground">{stats.totalRatings}</span> ratings
                  </p>
                  <div className="mt-6 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-500">{stats.positivePercent}% positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-400">{stats.negativePercent}% negative</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto mb-4">
                    <Star className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold">No feedback yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Feedback requests are sent automatically after delivery. Ratings will appear here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Reviews */}
          <motion.div variants={itemVariants} className="glass rounded-2xl p-6 border border-border/40">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  Recent Reviews
                  {ratingFilter > 0 && (
                    <span className="ml-2 text-xs font-normal text-primary">
                      (Showing {ratingFilter}★ only)
                    </span>
                  )}
                </h3>
              </div>
              {ratingFilter > 0 && (
                <button
                  onClick={() => setRatingFilter(0)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Show All
                </button>
              )}
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const info = RATING_LABELS[review.rating] || RATING_LABELS[3];
                  const cust = review.customers;
                  const customerName = cust?.saved_name || cust?.whatsapp_name || "Customer";
                  const items = (review.items as Array<Record<string, unknown>> || [])
                    .map((i) => i.item_name)
                    .slice(0, 3);

                  return (
                    <div
                      key={review.id}
                      className="flex items-start gap-4 rounded-xl bg-muted/20 border border-border/10 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 text-lg ${
                          review.rating >= 4
                            ? "bg-emerald-500/10"
                            : review.rating === 3
                            ? "bg-amber-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {info.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{customerName}</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= review.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-semibold ${info.color}`}>
                            {info.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                          <ShoppingCart className="h-3 w-3" />
                          #{review.order_number}
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          {new Date(review.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                          <span>·</span>
                          ₹{((review.total || 0) / 100).toLocaleString("en-IN")}
                        </p>
                        {items.length > 0 && (
                          <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                            {items.join(", ")}
                            {(review.items || []).length > 3 && " ..."}
                          </p>
                        )}
                        {review.feedback && (
                          <p className="text-sm text-foreground mt-2 italic border-l-2 border-primary/20 pl-3">
                            &ldquo;{review.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                  <MessageSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">No reviews yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  {ratingFilter > 0
                    ? `No ${ratingFilter}★ reviews found. Try viewing all ratings.`
                    : "Reviews will appear here once customers rate their orders."}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
