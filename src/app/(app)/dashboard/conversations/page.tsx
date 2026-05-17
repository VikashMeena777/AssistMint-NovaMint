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

interface ConversationSession {
  customer_phone: string;
  customer_id: string | null;
  customer_name: string;
  latest_message: string;
  latest_role: string;
  latest_time: string;
  requires_human: boolean;
  message_count: number;
}

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [messages, setMessages] = useState<AnyData[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
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

    // Get all messages grouped by customer_phone
    const { data: allMessages } = await supabase
      .from("conversations")
      .select("customer_phone, customer_id, role, content, requires_human, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!allMessages || allMessages.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    // Get customer info
    const { data: customers } = await supabase
      .from("customers")
      .select("id, phone, saved_name, whatsapp_name")
      .eq("restaurant_id", restaurantId);

    const customerMap = new Map<string, { name: string; id: string }>();
    (customers || []).forEach((c: AnyData) => {
      customerMap.set(c.phone, {
        name: c.saved_name || c.whatsapp_name || c.phone,
        id: c.id,
      });
    });

    // Group messages by customer_phone into sessions
    const sessionMap = new Map<string, ConversationSession>();
    (allMessages as AnyData[]).forEach((msg) => {
      const phone = msg.customer_phone;
      if (!phone) return;
      if (!sessionMap.has(phone)) {
        const cust = customerMap.get(phone);
        sessionMap.set(phone, {
          customer_phone: phone,
          customer_id: msg.customer_id || cust?.id || null,
          customer_name: cust?.name || phone,
          latest_message: msg.content || "",
          latest_role: msg.role,
          latest_time: msg.created_at,
          requires_human: msg.requires_human || false,
          message_count: 0,
        });
      }
      const session = sessionMap.get(phone)!;
      session.message_count++;
    });

    setSessions(Array.from(sessionMap.values()));
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadConversations();
    // Auto-refresh conversations every 15 seconds
    const interval = setInterval(() => {
      if (restaurantId) loadConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [restaurantId, loadConversations]);

  const refreshMessages = useCallback(async (phone: string) => {
    if (!restaurantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("customer_phone", phone)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  }, [restaurantId]);

  const loadMessages = async (session: ConversationSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    await refreshMessages(session.customer_phone);
    setLoadingMessages(false);
  };

  // Auto-refresh selected conversation messages every 10 seconds
  useEffect(() => {
    if (!selectedSession) return;
    const interval = setInterval(() => {
      refreshMessages(selectedSession.customer_phone);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedSession, refreshMessages]);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const name = s.customer_name.toLowerCase();
    const phone = s.customer_phone.toLowerCase();
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
                {filtered.map((s) => (
                  <button
                    key={s.customer_phone}
                    onClick={() => loadMessages(s)}
                    className={`flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors ${
                      selectedSession?.customer_phone === s.customer_phone ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                      {s.customer_name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {s.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.latest_message.substring(0, 40)}
                        {s.latest_message.length > 40 ? "..." : ""}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {s.requires_human ? (
                          <>
                            <User className="h-3 w-3" /> Manual
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3" /> AI handling
                          </>
                        )}
                        <span className="ml-1">
                          ·{" "}
                          {new Date(s.latest_time).toLocaleString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">
                          {s.message_count}
                        </span>
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
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {selectedSession.customer_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedSession.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedSession.customer_phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedSession.requires_human ? (
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
                        msg.role === "user" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-muted/50 text-foreground rounded-bl-md"
                            : "bg-primary text-primary-foreground rounded-br-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.role === "user"
                              ? "text-muted-foreground"
                              : "text-primary-foreground/60"
                          }`}
                        >
                          {msg.role === "assistant" ? "🤖 AI" : ""}{" "}
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
