// ============================================
// AssistMint — Real-Time Order Notifications
// Listens for new orders via Supabase Realtime
// Shows toast + plays sound in the dashboard
// ============================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

interface OrderPayload {
  id: string;
  order_number: string;
  customer_phone: string;
  total: number;
  status: string;
  items: { item_name: string; quantity: number }[];
  restaurant_id: string;
  created_at: string;
}

interface OrderRealtimeListenerProps {
  restaurantId: string;
}

// Notification sound — short pleasant chime using Web Audio API
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Play a two-tone chime: C5 then E5
    const notes = [523.25, 659.25]; // C5, E5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);

      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio not available — silent fallback
  }
}

export default function OrderRealtimeListener({ restaurantId }: OrderRealtimeListenerProps) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const handleNewOrder = useCallback(
    (payload: RealtimePostgresInsertPayload<OrderPayload>) => {
      const order = payload.new;
      if (!order || order.restaurant_id !== restaurantId) return;

      // Play notification sound
      playNotificationSound();

      // Show rich toast notification
      const items = order.items || [];
      const itemSummary = items.slice(0, 3).map((i) => `${i.quantity}x ${i.item_name}`).join(", ");
      const more = items.length > 3 ? ` +${items.length - 3} more` : "";
      const totalRupees = ((order.total || 0) / 100).toFixed(0);

      toast(
        `🔔 New Order #${order.order_number}`,
        {
          description: `${itemSummary}${more} · ₹${totalRupees}`,
          duration: 15000, // Stay visible for 15 seconds
          action: {
            label: "View Orders",
            onClick: () => {
              window.location.href = "/dashboard/orders";
            },
          },
        }
      );
    },
    [restaurantId]
  );

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();

    // Subscribe to new orders for this restaurant
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        handleNewOrder as any
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Listening for new orders");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId, handleNewOrder]);

  // This component renders nothing — it's a listener only
  return null;
}
