"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  Bot,
  User,
  Loader2,
  Phone,
  RefreshCw,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";
import { updateConversationTags } from "@/lib/actions/conversation-actions";
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
  tags: string[];
}

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [messages, setMessages] = useState<AnyData[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagsSaving, setTagsSaving] = useState(false);

  // Customer directory changes rarely — fetch once, not on every poll
  const customerMapRef = useRef<Map<string, { name: string; id: string }>>(new Map());
  // Signature of the last fetched message set — lets polls skip
  // re-rendering (and re-grouping) when nothing changed
  const lastSignatureRef = useRef<string>("");
  // Full-page skeleton only on the very first load; polls stay quiet
  const hasLoadedRef = useRef(false);

  const loadRestaurant = useCallback(async () => {
    try {
      const r = await getCurrentRestaurant();
      if (r?.id) setRestaurantId(r.id as string);
      else setLoading(false);
    } catch (err) {
      console.error("Failed to load restaurant:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      loadRestaurant();
    })();
  }, [loadRestaurant]);

  // Customer directory — one fetch per restaurant
  useEffect(() => {
    if (!restaurantId) return;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: customers } = await supabase
          .from("customers")
          .select("id, phone, saved_name, whatsapp_name")
          .eq("restaurant_id", restaurantId);
        const map = new Map<string, { name: string; id: string }>();
        (customers || []).forEach((c: AnyData) => {
          map.set(c.phone, {
            name: c.saved_name || c.whatsapp_name || c.phone,
            id: c.id,
          });
        });
        customerMapRef.current = map;
      } catch {
        // Non-fatal — sessions fall back to phone numbers
      }
    })();
  }, [restaurantId]);

  const loadConversations = useCallback(async () => {
    if (!restaurantId) return;
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const supabase = createClient();

      // Get all messages grouped by customer_phone
      const { data: allMessages } = await supabase
        .from("conversations")
        .select("customer_phone, customer_id, role, content, requires_human, created_at, tags")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!allMessages || allMessages.length === 0) {
        setSessions([]);
        hasLoadedRef.current = true;
        setLoading(false);
        return;
      }

      // Cheap change detection: newest message id + total count
      const signature = `${allMessages[0].created_at}:${allMessages.length}`;
      if (signature === lastSignatureRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
        return;
      }
      lastSignatureRef.current = signature;

      const customerMap = customerMapRef.current;

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
            tags: Array.isArray(msg.tags) ? (msg.tags as string[]) : [],
          });
        }
        const session = sessionMap.get(phone)!;
        session.message_count++;
        // Tags live on every row of the session; the first non-empty set wins
        if (session.tags.length === 0 && Array.isArray(msg.tags) && msg.tags.length > 0) {
          session.tags = msg.tags as string[];
        }
      });

      setSessions(Array.from(sessionMap.values()));
      hasLoadedRef.current = true;
      setLoading(false);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Could not load. Please retry.");
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      if (restaurantId) loadConversations();
    })();
    // Auto-refresh conversations every 15 seconds — paused while the
    // tab is hidden so background tabs stop hitting Supabase
    const interval = setInterval(() => {
      if (restaurantId && !document.hidden) loadConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [restaurantId, loadConversations]);

  const handleRetry = () => {
    setError(null);
    if (restaurantId) loadConversations();
    else loadRestaurant();
  };

  const refreshMessages = useCallback(async (phone: string) => {
    if (!restaurantId) return;
    const supabase = createClient();
    // Load latest 100 messages (descending) then reverse for chronological display
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(100);
    // Reverse to show oldest-first in the chat panel
    setMessages((data || []).reverse());
  }, [restaurantId]);

  const loadMessages = async (session: ConversationSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    await refreshMessages(session.customer_phone);
    setLoadingMessages(false);
  };

  // Auto-refresh selected conversation messages every 10 seconds —
  // paused while the tab is hidden
  useEffect(() => {
    if (!selectedSession) return;
    const interval = setInterval(() => {
      if (!document.hidden) refreshMessages(selectedSession.customer_phone);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedSession, refreshMessages]);

  // ── Tags ── save to the server, then mirror into local state
  const saveTags = async (phone: string, tags: string[]) => {
    if (!restaurantId) return;
    setTagsSaving(true);
    const result = await updateConversationTags(restaurantId, phone, tags);
    setTagsSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Tags updated");
    setSessions((prev) =>
      prev.map((s) => (s.customer_phone === phone ? { ...s, tags } : s))
    );
    setSelectedSession((prev) =>
      prev && prev.customer_phone === phone ? { ...prev, tags } : prev
    );
  };

  const addTag = () => {
    if (!selectedSession) return;
    const tag = tagInput.trim();
    if (!tag) return;
    if (selectedSession.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTagInput("");
    saveTags(selectedSession.customer_phone, [...selectedSession.tags, tag]);
  };

  // Every tag in use across sessions (for the filter dropdown)
  const allTags = Array.from(new Set(sessions.flatMap((s) => s.tags || []))).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      !search ||
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_phone.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !tagFilter || (s.tags || []).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            Every AI conversation, live. Human handoffs are flagged below.
          </p>
        </div>
        <button
          onClick={loadConversations}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Conversation Layout — fixed app-style height only at lg; on mobile
          the panes stack naturally (the old inline calc(100vh-220px) clipped
          both panes into one short box on phones). */}
      <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-220px)] lg:grid-cols-3">
        {/* Conversation List — capped on mobile so it can't push the chat
            pane below several screens of scroll */}
        <div className="flex max-h-[65vh] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card lg:col-span-1 lg:max-h-none">
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
            {allTags.length > 0 ? (
              <div className="relative mt-2">
                <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  aria-label="Filter by tag"
                  className="flex h-9 w-full appearance-none rounded-lg border border-input bg-muted/50 pl-9 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && !sessions.length ? (
              <div className="p-4">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-24 rounded-lg bg-muted animate-pulse" />
                      <div className="h-3 w-36 rounded-lg bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
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
                    className={`flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/60 transition-colors ${
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
                      {s.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {s.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                          {s.tags.length > 2 ? (
                            <span className="text-[10px] text-muted-foreground">
                              +{s.tags.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
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
                    <span className="flex items-center gap-1.5 rounded-full bg-success/10 border border-success/25 px-3 py-1 text-xs font-medium text-success">
                      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      AI Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/25 px-3 py-1 text-xs font-medium text-warning">
                      Manual Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Tags — stored per conversation session */}
              <div className="border-b border-border px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {selectedSession.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {tag}
                      <button
                        onClick={() =>
                          saveTags(
                            selectedSession.customer_phone,
                            selectedSession.tags.filter((t) => t !== tag)
                          )
                        }
                        aria-label={`Remove tag ${tag}`}
                        className="text-primary/60 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder={
                      selectedSession.tags.length
                        ? "Add tag…"
                        : "Add a tag (VIP, catering, follow-up…)…"
                    }
                    maxLength={24}
                    className="h-7 min-w-[140px] flex-1 rounded-lg border border-dashed border-border bg-transparent px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  {tagsSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : null}
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
              <div className="mt-4 flex items-center gap-2 rounded-full bg-success/10 border border-success/25 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">Bot Online</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
