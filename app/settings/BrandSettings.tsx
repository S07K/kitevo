"use client";

import { useState, useEffect, useRef } from "react";
import { BrandPlanCard } from "@/app/settings/BrandPlanCard";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";

async function resizeToJpegDataUrl(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setLogoError("Choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setLogoError("Image is too large (max 8MB)."); return; }
    setLogoError(null);
    setLogoUploading(true);
    try {
      const dataUrl = await resizeToJpegDataUrl(file);
      const res = await fetch("/api/brand/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoDataUrl: dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLogoError(json.error ?? "Upload failed"); return; }
      const newLogoUrl = json.logoUrl ?? "";
      setForm((f) => ({ ...f, logoUrl: newLogoUrl }));
      window.dispatchEvent(new CustomEvent("kitevo:avatar-updated", { detail: { avatarUrl: newLogoUrl } }));
    } catch {
      setLogoError("Could not process image.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function removeLogo() {
    setLogoUploading(true);
    try {
      await fetch("/api/brand/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoDataUrl: null }),
      });
      setForm((f) => ({ ...f, logoUrl: "" }));
      window.dispatchEvent(new CustomEvent("kitevo:avatar-updated", { detail: { avatarUrl: "" } }));
    } finally {
      setLogoUploading(false);
    }
  }

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
    <WorkspaceShell variant="brand" width="narrow">
        <PageHeader eyebrow="Settings" title="Brand settings" description="Your plan and the company profile creators see on your campaigns." />
        <div className="space-y-8">

          {/* Plan / upgrade */}
          <BrandPlanCard />

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

              {/* Logo upload */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Company logo</label>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFile} />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="relative h-16 w-16 rounded-2xl border-2 border-dashed border-border bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center overflow-hidden shrink-0 disabled:opacity-50"
                  >
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : logoUploading ? (
                      <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                  </button>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {logoUploading ? "Uploading…" : form.logoUrl ? "Change logo" : "Upload logo"}
                    </button>
                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        disabled={logoUploading}
                        className="block text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP · max 8MB</p>
                  </div>
                </div>
                {logoError && <p className="mt-1.5 text-xs text-red-500">{logoError}</p>}
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
    </WorkspaceShell>
  );
}
