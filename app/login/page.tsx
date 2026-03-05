"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppNav } from "../components/AppNav";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
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

  return (
    <div className="min-h-screen">
      <AppNav links={[{ href: "/", label: "Home" }, { href: "/pricing", label: "Pricing" }]} />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-md mx-auto">
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Log in</h1>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#1A1A1A] font-medium underline">
            Sign up
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-sm bg-white text-[#1A1A1A]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-sm bg-white text-[#1A1A1A]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
