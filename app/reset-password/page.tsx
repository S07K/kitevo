"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/app/components/AuthLayout";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Something went wrong"); setLoading(false); return; }
      router.push("/login?verified=1");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing or malformed.">
        <Link href="/forgot-password" className="text-sm text-foreground underline underline-offset-4 hover:no-underline">
          Request a new reset link
        </Link>
      </AuthLayout>
    );
  }

  const inputCls = "w-full rounded-xl border border-border bg-background dark:bg-white/[0.06] text-foreground placeholder:text-muted-foreground px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">New password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Min 8 characters" />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputCls} placeholder="Repeat your password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Loading…</span></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
