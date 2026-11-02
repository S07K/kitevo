"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Building2, Camera, Check, ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import { BrandPlanCard } from "./BrandPlanCard";
import { WorkspaceShell, PageHeader, Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { Skeleton, FieldSkeleton } from "@/app/components/Skeleton";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { AccountPanels } from "./AccountPanels";

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

const fieldCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/40";

/** Form section: heading + one-line hint, then fields. */
function FormSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-6 sm:px-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {children}
      {optional ? <span className="font-normal"> (optional)</span> : <span className="text-red-600 dark:text-red-400" aria-hidden> *</span>}
    </label>
  );
}

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
  // Last saved text fields, to show "unsaved changes" and disable Save when clean.
  const [savedForm, setSavedForm] = useState<BrandProfile | null>(null);
  const [account, setAccount] = useState<{ email: string | null; username: string | null; verifiedTier: string | null }>({
    email: null,
    username: null,
    verifiedTier: null,
  });

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
        const next = {
          companyName: d?.companyName ?? "",
          industry: d?.industry ?? "",
          budgetRange: d?.budgetRange ?? "",
          website: d?.website ?? "",
          logoUrl: d?.logoUrl ?? "",
          description: d?.description ?? "",
        };
        setForm(next);
        setSavedForm(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setAccount({ email: p.email ?? null, username: p.username ?? null, verifiedTier: p.verifiedTier ?? null }))
      .catch(() => {});
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
        setSavedForm(form);
        setSaved(true);
        // The sidebar persists across tabs; for brands its name is the company name.
        window.dispatchEvent(new CustomEvent("kitevo:profile-updated", { detail: { name: form.companyName.trim() } }));
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Logo saves on upload, so it's excluded from the dirty check.
  const dirty = useMemo(() => {
    if (!savedForm) return false;
    const pick = (f: BrandProfile) => JSON.stringify([f.companyName.trim(), f.industry, f.budgetRange, f.website.trim(), f.description.trim()]);
    return pick(form) !== pick(savedForm);
  }, [form, savedForm]);
  const missing = [!form.companyName.trim() && "company name", !form.industry && "industry", !form.budgetRange && "budget range"].filter(
    Boolean,
  ) as string[];

  return (
    <WorkspaceShell variant="brand" width="wide">
      <PageHeader eyebrow="Settings" title="Brand settings" description="The company profile creators see on your campaigns, and your plan." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main: company profile ── */}
        <div className="min-w-0 lg:col-span-2">
          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Company profile <VerifiedBadge tier={account.verifiedTier} size="sm" />
              </span>
            }
            action={
              account.username ? (
                <Link
                  href={`/${account.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View profile <ExternalLink size={12} aria-hidden />
                </Link>
              ) : null
            }
            bodyClassName=""
          >
            {loading ? (
              <div className="space-y-6 p-5 sm:p-6" aria-hidden>
                <div className="flex items-center gap-5">
                  <Skeleton className="h-24 w-24 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                    <Skeleton className="h-3 w-3/4 rounded-full" />
                    <Skeleton className="mt-3 h-8 w-32 rounded-full" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
                <FieldSkeleton tall />
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dirty && missing.length === 0) save();
                }}
              >
                <div className="divide-y divide-border">
                  {/* ── Logo ── */}
                  <section className="px-5 py-6 sm:px-6">
                    <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFile} />
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="relative h-24 w-24 shrink-0">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                          {form.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 data URL
                            <img src={form.logoUrl} alt="Company logo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : form.companyName.trim() ? (
                            <span className="font-display text-3xl text-muted-foreground">{form.companyName.trim()[0].toUpperCase()}</span>
                          ) : (
                            <Building2 size={28} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                          )}
                          {logoUploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45">
                              <Loader2 size={20} className="animate-spin text-white" aria-label="Updating logo" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={logoUploading}
                          onClick={() => logoInputRef.current?.click()}
                          aria-label={form.logoUrl ? "Change logo" : "Upload logo"}
                          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
                        >
                          <Camera size={14} aria-hidden />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">Company logo</h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          Shown on your campaigns, your public profile and in messages. JPG, PNG or WebP, up to 8MB. Saves as soon as you pick one.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                            <Upload size={13} aria-hidden /> {form.logoUrl ? "Change logo" : "Upload logo"}
                          </Button>
                          {form.logoUrl && (
                            <Button size="sm" variant="ghost" disabled={logoUploading} onClick={removeLogo} className="hover:text-red-600 dark:hover:text-red-400">
                              <Trash2 size={13} aria-hidden /> Remove
                            </Button>
                          )}
                        </div>
                        {logoError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{logoError}</p>}
                      </div>
                    </div>
                  </section>

                  {/* ── Company ── */}
                  <FormSection title="Company" hint="How creators recognise you on campaign cards and in their inbox.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="bs-name">Company name</Label>
                        <input
                          id="bs-name"
                          type="text"
                          value={form.companyName}
                          onChange={(e) => set("companyName", e.target.value)}
                          placeholder="Acme Inc."
                          autoComplete="organization"
                          className={fieldCls}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bs-industry">Industry</Label>
                        <select id="bs-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} className={`${fieldCls} h-[42px]`}>
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="bs-website" optional>
                          Website
                        </Label>
                        <input
                          id="bs-website"
                          type="url"
                          value={form.website}
                          onChange={(e) => set("website", e.target.value)}
                          placeholder="https://yourcompany.com"
                          autoComplete="url"
                          className={fieldCls}
                        />
                      </div>
                    </div>
                  </FormSection>

                  {/* ── Budget ── */}
                  <FormSection title="Typical campaign budget" hint="Helps creators judge fit before they apply. Shown as a range, never an exact figure.">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Campaign budget range">
                      {BUDGET_RANGES.map((b) => {
                        const on = form.budgetRange === b;
                        return (
                          <button
                            key={b}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set("budgetRange", b)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground"
                            }`}
                          >
                            {on && <Check size={12} strokeWidth={3} aria-hidden />}
                            {b}
                          </button>
                        );
                      })}
                    </div>
                  </FormSection>

                  {/* ── About ── */}
                  <FormSection title="About your brand" hint="What you do and the kind of creators you want to work with. Shown on your public profile.">
                    <label htmlFor="bs-about" className="sr-only">
                      About your brand
                    </label>
                    <textarea
                      id="bs-about"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="What does your brand do? What kind of creators are you looking for?"
                      rows={4}
                      className={`${fieldCls} resize-y`}
                    />
                  </FormSection>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {error ? (
                      <span className="font-medium text-red-600 dark:text-red-400">{error}</span>
                    ) : saved && !dirty ? (
                      <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                        <Check size={13} aria-hidden /> Saved
                      </span>
                    ) : dirty && missing.length > 0 ? (
                      `Add your ${missing.join(", ")} to save`
                    ) : dirty ? (
                      "You have unsaved changes"
                    ) : (
                      "All changes saved"
                    )}
                  </p>
                  <Button type="submit" variant="primary" disabled={saving || logoUploading || !dirty || missing.length > 0}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </Panel>
        </div>

        {/* ── Rail: plan, account ── */}
        <aside className="min-w-0 space-y-6">
          <BrandPlanCard />
          <AccountPanels email={account.email} />
        </aside>
      </div>
    </WorkspaceShell>
  );
}
