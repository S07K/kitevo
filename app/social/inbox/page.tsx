"use client";

import { useState, useEffect, useCallback } from "react";
import { AppNav } from "@/app/components/AppNav";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { signOut } from "next-auth/react";

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
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setMyUserId(d.id ?? null))
      .catch(() => {});
  }, []);

  const loadConvos = useCallback(() => {
    fetch("/api/social/conversations", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setConversations(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConvos();
    const id = setInterval(loadConvos, 3000);
    return () => clearInterval(id);
  }, [loadConvos]);

  useEffect(() => {
    if (!activeId) return;
    const load = () => {
      fetch(`/api/social/conversations/${activeId}`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => Array.isArray(d) && setMessages(d))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [activeId]);

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
      const d = await fetch(`/api/social/conversations/${activeId}`, { credentials: "include" }).then((r) => r.json());
      if (Array.isArray(d)) setMessages(d);
    } finally {
      setSending(false);
    }
  }

  const activeConvo = conversations.find((c) => c.id === activeId);
  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/social/inbox", label: unreadCount > 0 ? `Inbox (${unreadCount})` : "Inbox" },
        ]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="mx-auto max-w-5xl px-5 sm:px-8 pt-24 pb-24">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Brands reach out here when they want to work with you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 border border-border rounded-2xl overflow-hidden min-h-[560px]">
          {/* List */}
          <div className="border-r border-border bg-muted/20">
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Conversations</p>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">No messages yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Make sure your profile is set to open to collaborations.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((c) => {
                  const other = c.other;
                  const displayName = other?.brandProfile?.companyName ?? other?.name ?? other?.username ?? "Unknown";
                  const avatar = other?.brandProfile?.logoUrl ?? other?.avatarUrl;
                  const initials = displayName.charAt(0).toUpperCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${activeId === c.id ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-border">
                            {avatar ? (
                              <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">{initials}</div>
                            )}
                          </div>
                          {c.unread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border border-background" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className={`text-xs truncate ${c.unread ? "font-semibold text-foreground" : "text-foreground"}`}>{displayName}</p>
                            {other?.accountType === "brand" && (
                              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded px-1 shrink-0">BRAND</span>
                            )}
                          </div>
                          {c.lastMessage && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {c.lastMessage.mine ? "You: " : ""}{c.lastMessage.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thread */}
          <div className="flex flex-col bg-background">
            {!activeId ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <p className="text-sm text-muted-foreground">Select a conversation to read and reply</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  {activeConvo?.other && (
                    <p className="text-sm font-semibold text-foreground">
                      {activeConvo.other.brandProfile?.companyName ?? activeConvo.other.name ?? activeConvo.other.username}
                      {activeConvo.other.accountType === "brand" && (
                        <span className="ml-2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">BRAND</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-96">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-8">No messages yet</p>
                  )}
                  {messages.map((m) => {
                    const mine = m.senderId === myUserId;
                    return (
                      <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border border-border shrink-0 mb-0.5">
                            {m.sender.avatarUrl ? (
                              <img src={m.sender.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                {(m.sender.name ?? "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine ? "bg-foreground text-background rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-border flex gap-2">
                  <input
                    type="text"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Reply…"
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!msgInput.trim() || sending}
                    className="h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
