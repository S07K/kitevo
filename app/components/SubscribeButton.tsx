"use client";

import { useState } from "react";

export function SubscribeButton({ email }: { email?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    const userEmail = email || prompt("Enter your email to subscribe:");
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full px-8 py-4 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting to checkout..." : "Subscribe — $15/month"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
