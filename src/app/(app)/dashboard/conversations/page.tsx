"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Bot,
  User,
  Loader2,
  Phone,
  RefreshCw,
} from "lucide-react";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";
import { createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<AnyData[]>([]);
  const [messages, setMessages] = useState<AnyData[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<AnyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const r = await getCurrentRestaurant();
      if (r?.id) setRestaurantId(r.id as string);
      else setLoading(false);
    })();
  }, []);

  const loadConversations = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("*, customers(name, phone)")
      .eq("restaurant_id", restaurantId)
      .order("last_message_at", { ascending: false })
      .limit(50);
    setConversations(data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadConversations();
  }, [restaurantId, loadConversations]);

  const loadMessages = async (convo: AnyData) => {
    setSelectedConvo(convo);
    setLoadingMessages(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    setLoadingMessages(false);
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.customers?.name?.toLowerCase() || "";
    const phone = c.phone?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            Live WhatsApp conversations powered by AI. Take over anytime.
          </p>
        </div>
        <button
          onClick={loadConversations}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Conversation Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ height: "calc(100vh - 220px)" }}>
        {/* Conversation List */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden lg:col-span-1 flex flex-col">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="flex h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conversations appear when customers message your bot.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c)}
                    className={`flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors ${
                      selectedConvo?.id === c.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                      {(c.customers?.name || c.phone || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {c.customers?.name || c.phone || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {c.is_bot_active ? (
                          <>
                            <Bot className="h-3 w-3" /> AI handling
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" /> Manual
                          </>
                        )}
                        {c.last_message_at && (
                          <span className="ml-1">
                            ·{" "}
                            {new Date(c.last_message_at).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden lg:col-span-2 flex flex-col">
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(selectedConvo.customers?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedConvo.customers?.name || "Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedConvo.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConvo.is_bot_active ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      AI Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-600">
                      Manual Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No messages in this conversation.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "customer" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.sender_type === "customer"
                            ? "bg-muted/50 text-foreground rounded-bl-md"
                            : "bg-primary text-primary-foreground rounded-br-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_type === "customer"
                              ? "text-muted-foreground"
                              : "text-primary-foreground/60"
                          }`}
                        >
                          {msg.sender_type === "bot" ? "🤖 AI" : msg.sender_type === "agent" ? "👤 Agent" : ""}{" "}
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI Assistant Active</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                Your AI chatbot is handling conversations automatically. Select a
                conversation from the left to view the chat history.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600">Bot Online</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
