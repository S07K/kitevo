"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNav } from "../components/AppNav";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/login?callbackUrl=/dashboard");
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
        <h1 className="font-display text-2xl font-semibold text-[#1A1A1A]">Create account</h1>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1A1A1A] font-medium underline">
            Log in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-sm bg-white text-[#1A1A1A]"
            />
          </div>
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
              Password (min 8 characters)
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-[#E8E6E3] rounded-sm bg-white text-[#1A1A1A]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
      </main>
    </div>
  );
}
