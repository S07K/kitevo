"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const inputCls = "border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "text-foreground mb-1.5 block text-sm font-medium";

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="border-border border-b bg-background/95 px-5 py-4 backdrop-blur-md sm:px-8">
        <Link href="/" className="font-display text-foreground text-lg font-semibold tracking-tight transition-opacity hover:opacity-70">
          Media Kit Pro
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="bg-background border-border w-full max-w-sm rounded-2xl border p-8 shadow-sm">
          <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground font-medium underline underline-offset-4 hover:no-underline">
              Log in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="name" className={labelCls}>Name (optional)</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelCls}>Password (min 8 characters)</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputCls}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-foreground text-background mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            By signing up you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:no-underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:no-underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
