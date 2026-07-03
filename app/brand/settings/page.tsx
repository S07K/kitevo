"use client";

import { useState, useEffect } from "react";
import { AppNav } from "@/app/components/AppNav";
import { AppSidebar } from "@/app/components/AppSidebar";

const INDUSTRIES = [
  "Tech & SaaS", "Fashion", "Beauty", "Food & Beverage", "Health & Wellness",
  "Travel", "Fitness", "Gaming", "Finance", "Education", "Entertainment",
  "Home & Lifestyle", "Sports", "Automotive", "Other",
];

const BUDGET_RANGES = ["Under $500", "$500–$2k", "$2k–$10k", "$10k–$50k", "$50k+"];

type BrandProfile = {
  companyName: string;
  industry: string;
  budgetRange: string;
  website: string;
  logoUrl: string;
  description: string;
};

export default function BrandSettings() {
  const [form, setForm] = useState<BrandProfile>({
    companyName: "",
    industry: "",
    budgetRange: "",
    website: "",
    logoUrl: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brand/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setForm({
            companyName: d.companyName ?? "",
            industry: d.industry ?? "",
            budgetRange: d.budgetRange ?? "",
            website: d.website ?? "",
            logoUrl: d.logoUrl ?? "",
            description: d.description ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof BrandProfile, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <AppSidebar tabs={[
        { href: "/brand", label: "Discover" },
        { href: "/brand/campaigns", label: "Campaigns" },
        { href: "/brand/inbox", label: "Inbox" },
      ]} />

      <main className="md:ml-52 px-5 pt-[73px] pb-[72px] md:pb-16 sm:px-8">
        <div className="mx-auto max-w-xl py-6 space-y-8">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Brand settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">This is what creators see when they view your campaigns.</p>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-muted" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Company name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Company name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* Budget range */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Campaign budget range</label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_RANGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => set("budgetRange", b)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        form.budgetRange === b
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Logo URL</label>
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                {form.logoUrl && (
                  <div className="mt-2 h-12 w-12 rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={form.logoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">About your brand <span className="text-muted-foreground/50">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What does your brand do? What kind of creators are you looking for?"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="button"
                onClick={save}
                disabled={saving || !form.companyName.trim() || !form.industry || !form.budgetRange}
                className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
