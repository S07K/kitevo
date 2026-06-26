"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/app/components/AuthLayout";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const verified = searchParams.get("verified") === "1";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
      if (res?.error === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email.trim().toLowerCase());
        setLoading(false);
        return;
      }
      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendStatus("sending");
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail }),
    });
    setResendStatus("sent");
  }

  const inputCls = "w-full rounded-xl border border-border bg-muted/50 dark:bg-white/[0.06] text-foreground placeholder:text-muted-foreground px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

  return (
    <AuthLayout
      title="Log in"
      subtitle={<>Don&apos;t have an account?{" "}<Link href="/signup" className="text-foreground font-medium underline underline-offset-4 hover:no-underline">Sign up</Link></>}
    >
      {/* Google SSO */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-muted/50 dark:bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Success / error banners */}
      {verified && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          Email verified! You can now log in.
        </div>
      )}
      {errorParam === "expired-token" && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          That verification link has expired. Sign in and request a new one.
        </div>
      )}
      {unverifiedEmail && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Please verify your email first.</p>
          <p className="mt-0.5 text-amber-700">Check your inbox for a verification link.</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendStatus !== "idle"}
            className="mt-2 text-xs font-medium underline underline-offset-4 hover:no-underline disabled:opacity-60"
          >
            {resendStatus === "sending" ? "Sending…" : resendStatus === "sent" ? "Sent! Check your inbox." : "Resend verification email"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function LoginFormPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Loading…</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
