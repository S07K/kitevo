"use client";

import { useState } from "react";

export function PasswordWall({
  kitId,
  kitName,
  creatorName,
  avatarUrl,
}: {
  kitId: string;
  kitName: string;
  creatorName: string;
  avatarUrl?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kits/${kitId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <p className="text-foreground font-semibold">{creatorName}</p>
          <p className="text-muted-foreground text-sm mt-0.5">{kitName}</p>
        </div>

        {/* Lock card */}
        <div className="bg-background border-border rounded-2xl border p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="font-semibold text-foreground">Private kit</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-5 ml-10">
            This media kit is password-protected. Enter the password to view it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-xs">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Checking…" : "View kit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
