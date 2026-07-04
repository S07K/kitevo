"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppNav } from "@/app/components/AppNav";
import { AppSidebar } from "@/app/components/AppSidebar";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { useRealtimeStream } from "@/app/hooks/useRealtimeStream";

type Conversation = {
  id: string;
  other: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    accountType: string;
    verifiedTier: string | null;
    brandProfile: { companyName: string; logoUrl: string | null } | null;
  } | null;
  lastMessage: { body: string; at: string; mine: boolean } | null;
  unread: boolean;
  lastReadAt: string | null;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { name: string | null; avatarUrl: string | null; accountType: string; verifiedTier: string | null };
};

export default function CreatorInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const activeIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const myUserIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  activeIdRef.current = activeId;
  conversationsRef.current = conversations;
  myUserIdRef.current = myUserId;

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setMyUserId(d.id ?? null))
      .catch(() => {});
  }, []);

  const loadConvos = useCallback(() => {
    fetch("/api/social/conversations", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (Array.isArray(d)) {
          setConversations(d);
          setUnreadCount(d.filter((c: Conversation) => c.unread).length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = useCallback((id: string) => {
    fetch(`/api/social/conversations/${id}`, { credentials: "include" })
      .then(() => loadConvos())
      .catch(() => {});
  }, [loadConvos]);

  // Initial load of conversations and messages
  useEffect(() => { loadConvos(); }, [loadConvos]);
  useEffect(() => {
    if (!activeId) { setFirstUnreadId(null); return; }
    fetch(`/api/social/conversations/${activeId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!Array.isArray(d)) return;
        setMessages(d);
        // Find first unread message to show the divider
        const convo = conversationsRef.current.find((c) => c.id === activeId);
        if (convo?.unread && convo.lastReadAt) {
          const lastRead = new Date(convo.lastReadAt);
          const first = d.find((m: Message) => new Date(m.createdAt) > lastRead && m.senderId !== myUserIdRef.current);
          setFirstUnreadId(first?.id ?? null);
        } else {
          setFirstUnreadId(null);
        }
        loadConvos();
      })
      .catch(() => {});
  }, [activeId, loadConvos]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SSE replaces all polling
  useRealtimeStream({
    onMessages: (conversationId, newMsgs) => {
      if (conversationId === activeIdRef.current) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = (newMsgs as Message[]).filter((m) => !existingIds.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        // Conversation is open — mark read immediately so badge doesn't flash
        markRead(conversationId);
      } else {
        loadConvos();
      }
    },
    onConversationsUpdated: loadConvos,
  });

  async function sendMessage() {
    if (!msgInput.trim() || !activeId) return;
    setSending(true);
    try {
      await fetch(`/api/social/conversations/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: msgInput.trim() }),
        credentials: "include",
      });
      setMsgInput("");
      // Optimistically fetch updated thread after sending
      const d = await fetch(`/api/social/conversations/${activeId}`, { credentials: "include" }).then((r) => r.json());
      if (Array.isArray(d)) setMessages(d);
    } finally {
      setSending(false);
    }
  }

  const activeConvo = conversations.find((c) => c.id === activeId);

  const sidebarTabs = [
    { href: "/social/campaigns", label: "Campaigns" },
    { href: "/social/inbox", label: "Inbox", badge: unreadCount },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <AppNav />
      <AppSidebar tabs={sidebarTabs} />

      <div className="flex-1 overflow-hidden mt-[57px] md:ml-52 pb-[52px] md:pb-0">
        <div className="flex h-full border-t border-border">
          {/* Sidebar */}
          <div className={`${activeId ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 md:shrink-0 border-r border-border`}>
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Messages</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[68px] bg-muted/50 animate-pulse rounded-lg" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Brands will reach out here.</p>
                </div>
              ) : (
                <div>
                  {conversations.map((c) => {
                    const other = c.other;
                    const displayName = other?.brandProfile?.companyName ?? other?.name ?? other?.username ?? "Unknown";
                    const avatar = other?.brandProfile?.logoUrl ?? other?.avatarUrl;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`w-full text-left px-5 py-4 flex items-center gap-3 transition-colors hover:bg-muted/40 border-b border-border/50 ${activeId === c.id ? "bg-muted/60" : ""}`}
                      >
                        <div className="relative shrink-0">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border">
                            {avatar ? (
                              <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {c.unread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-background" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`text-sm truncate ${c.unread ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{displayName}</p>
                            {c.lastMessage?.at && (
                              <p className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(c.lastMessage.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </p>
                            )}
                          </div>
                          {c.lastMessage && (
                            <p className={`text-xs truncate ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>
                              {c.lastMessage.mine ? "You: " : ""}{c.lastMessage.body}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Thread */}
          <div className={`${!activeId ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0 overflow-hidden bg-background`}>
            {!activeId ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-4 border-b border-border flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="md:hidden shrink-0 -ml-1 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Back to messages"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 5l-7 7 7 7"/>
                    </svg>
                  </button>
                  {activeConvo?.other && (() => {
                    const other = activeConvo.other;
                    const displayName = other.brandProfile?.companyName ?? other.name ?? other.username ?? "Unknown";
                    const avatar = other.brandProfile?.logoUrl ?? other.avatarUrl;
                    return (
                      <>
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                          {avatar ? (
                            <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{displayName}</p>
                      </>
                    );
                  })()}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
                  {messages.length === 0 && <p className="text-xs text-muted-foreground text-center mt-12">No messages yet — say hello</p>}
                  {messages.map((m) => {
                    const mine = m.senderId === myUserId;
                    return (
                      <div key={m.id}>
                        {m.id === firstUnreadId && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">New messages</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <div className={`flex items-end gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
                          {!mine && (
                            <div className="h-7 w-7 rounded-full overflow-hidden bg-muted border border-border shrink-0 mb-0.5">
                              {m.sender.avatarUrl ? (
                                <img src={m.sender.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                  {(m.sender.name ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[68%] px-4 py-2.5 text-sm leading-relaxed ${mine ? "bg-foreground text-background rounded-2xl rounded-br-md" : "bg-muted text-foreground rounded-2xl rounded-bl-md"}`}>
                            {m.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-6 py-4 border-t border-border shrink-0">
                  <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-2xl px-4 py-2.5">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Type a message…"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!msgInput.trim() || sending}
                      className="shrink-0 h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30"
                    >
                      {sending ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Enter to send</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
