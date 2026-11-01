"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { PalettePicker } from "@/app/components/Appearance";

/** Settings rail footer shared by creators and brands: who's signed in + delete account. */
export function AccountPanels({ email }: { email: string | null }) {
  const [step, setStep] = useState<"idle" | "sent" | "confirmed">("idle");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const requestCode = async (resend = false) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
        return;
      }
      if (resend) setCode("");
      else setSentTo(data.email);
      setDevCode(data.devCode ?? null);
      setStep("sent");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to confirm");
        return;
      }
      setStep("confirmed");
      await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
      signOut({ callbackUrl: "/?deleted=1" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Panel title="Account">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{email ?? "—"}</p>
        <Button
          className="mt-4 w-full"
          onClick={async () => {
            await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
            signOut({ callbackUrl: "/" });
          }}
        >
          <LogOut size={14} aria-hidden /> Sign out
        </Button>
      </Panel>

      <section className="rounded-2xl border border-red-200 bg-background dark:border-red-900/60">
        <div className="border-b border-red-200 px-5 py-3.5 sm:px-6 dark:border-red-900/60">
          <h2 className="text-sm font-semibold tracking-tight text-red-600 dark:text-red-400">Danger zone</h2>
        </div>
        <div className="p-5 sm:p-6">
          {step === "idle" && (
            <>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Permanently deletes your account and all its data. This cannot be undone.
              </p>
              {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
              <Button variant="danger-outline" className="mt-4 w-full" disabled={loading} onClick={() => requestCode()}>
                {loading ? "Sending code…" : "Delete account"}
              </Button>
            </>
          )}

          {step === "sent" && (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                We sent a 6-digit code to <strong>{sentTo}</strong>. Enter it to confirm.
              </p>
              {devCode && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <span className="font-sans font-semibold">Dev mode, email failed. Code: </span>
                  {devCode}
                </div>
              )}
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                aria-label="Deletion code"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("idle");
                    setCode("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" disabled={code.length !== 6 || loading} onClick={confirm}>
                  {loading ? "Deleting…" : "Confirm deletion"}
                </Button>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => requestCode(true)}
                className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Resend code
              </button>
            </div>
          )}

          {step === "confirmed" && <p className="text-sm text-muted-foreground">Account deleted. Signing you out…</p>}
        </div>
      </section>
    </>
  );
}

/** Settings rail: pick the app's light colour palette (dark mode lives in the account menu). */
export function AppearancePanel() {
  return (
    <Panel title="Appearance">
      <p className="mb-4 text-sm text-muted-foreground">
        Colour palette for your workspace. Your public kit keeps its own vibe.
      </p>
      <PalettePicker size="md" showLabels />
    </Panel>
  );
}
