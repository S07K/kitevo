"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { getPublicTiers } from "@/config/subscriptions";
import type { SubscriptionTier } from "@/config/subscriptions";

type AccountType = "creator" | "brand";

const STEPS = [
  { number: "01", title: "Your profile",       short: "Profile" },
  { number: "02", title: "Connect platforms",  short: "Platforms" },
  { number: "03", title: "Choose a plan",      short: "Plan" },
  { number: "04", title: "Create your kit",    short: "Kit" },
];

const totalSteps = STEPS.length;

const emptyProfile: ProfileFormProfile = {
  name: null,
  username: null,
  bio: null,
  avatarUrl: null,
  links: [],
};

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function PlatformRow({
  icon,
  name,
  description,
  connected,
  connectHref,
  connectLabel,
  error,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  connected: boolean;
  connectHref: string;
  connectLabel: string;
  error?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 shrink-0">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Connected
          </span>
        ) : (
          <a
            href={connectHref}
            className="shrink-0 inline-flex h-8 items-center rounded-full border border-foreground px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            {connectLabel}
          </a>
        )}
      </div>
      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step 0 — account type
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [accountTypeLoading, setAccountTypeLoading] = useState(true);
  const [accountTypeSaving, setAccountTypeSaving] = useState(false);

  // Brand onboarding fields (used when accountType === "brand")
  const [brandCompany, setBrandCompany] = useState("");
  const [brandIndustry, setBrandIndustry] = useState("");
  const [brandBudget, setBrandBudget] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  // Brand step: 0 = role picker, 1 = brand profile form
  const [brandStep, setBrandStep] = useState(0);

  const [currentStep, setCurrentStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Step 1 — profile
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Step 2 — platforms
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(false);

  // Step 3 — subscription
  const [hasSubscription, setHasSubscription] = useState(false);
  const [tierName, setTierName] = useState<string | null>(null);
  const [allowedKits, setAllowedKits] = useState(0);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [subscribeLoadingTier, setSubscribeLoadingTier] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // Step 4 — kit
  const [kits, setKits] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [newKitName, setNewKitName] = useState("");
  const [newKitSlug, setNewKitSlug] = useState("");
  const [addKitError, setAddKitError] = useState("");
  const [createKitLoading, setCreateKitLoading] = useState(false);
  const [kitCreated, setKitCreated] = useState(false);

  const instagramErrors: Record<string, string> = {
    not_configured: "Instagram connect is not configured.",
    invalid: "Invalid or expired request. Try again.",
    no_pages: "No Facebook Page found. Create a Page first.",
    permission_denied: "Access declined — grant all permissions when prompted.",
    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
    server: "Something went wrong. Try again.",
    access_denied: "You declined access. Try again.",
  };

  // Handle OAuth returns — bump to step 2 (platforms)
  useEffect(() => {
    const igConnected = searchParams.get("instagram_connected");
    const igErr = searchParams.get("instagram_error");
    const ytResult = searchParams.get("youtube");
    if (igConnected === "1" || igErr || ytResult) {
      /*
        Connecting a platform is a full page load, so all component state is lost and
        accountType comes back null. The picker at the top of the render is shown whenever
        accountType is falsy, so it covered the step UI and the user landed back at the
        very first screen even though setCurrentStep(1) below had already run.

        accountType is deliberately never restored as "creator" from the DB (every new user
        defaults to creator, so restoring it would skip the picker for genuinely new
        users). But arriving here proves the choice was already made: the platforms step is
        creator-only and sits past the picker. So restore it from that fact rather than
        from the DB. `prev ?? ` keeps a brand restore that already won the race.
      */
      setAccountType((prev) => prev ?? "creator");
      setAccountTypeLoading(false);
      setCurrentStep(1);
    }
  }, [searchParams]);

  // Handle the return from hosted checkout.
  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    /*
      No prefix check here. This used to require sessionId.startsWith("cs_"), a
      Stripe-specific format that would silently stop working on a provider swap: the page
      would simply never finalise the subscription. Validating the token is the server's
      job — /api/subscription-status asks the active provider via
      payments.isCheckoutSessionId and ignores anything it does not recognise.
    */
    if (success === "true" && sessionId) {
      setCurrentStep(2);
      fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setHasSubscription((data.allowedKits ?? 0) > 0);
            setTierName(data.tierName ?? null);
            setAllowedKits(data.allowedKits ?? 1);
          }
        })
        .finally(() => router.replace("/onboarding", { scroll: false }));
    }
  }, [searchParams, router]);

  // Restore role only if the user explicitly filled a brand profile already
  // (i.e. they refreshed mid-onboarding after choosing Brand).
  // Never restore "creator" from the DB default — always show the picker for new users.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.companyName) {
          setAccountType("brand");
          setBrandStep(1);
          setBrandCompany(data.companyName ?? "");
          setBrandIndustry(data.industry ?? "");
          setBrandBudget(data.budgetRange ?? "");
          setBrandWebsite(data.website ?? "");
          setBrandDescription(data.description ?? "");
        }
      })
      .finally(() => { if (!cancelled) setAccountTypeLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load profile
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setProfile(data); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load platform connection status when on step 2
  useEffect(() => {
    if (currentStep !== 1) return;
    setPlatformsLoading(true);
    Promise.all([
      fetch("/api/instagram/status", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/youtube/stats", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
    ]).then(([ig, yt]) => {
      setInstagramConnected(ig?.connected === true);
      setYoutubeConnected(yt !== null && typeof yt === "object" && "subscriberCount" in yt);
    }).finally(() => setPlatformsLoading(false));
  }, [currentStep]);

  // Load subscription + kits on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/kits", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/subscription-status", { method: "POST", credentials: "include" }).then((r) => (r.ok ? r.json() : {})),
    ]).then(([list, sub]) => {
      if (cancelled) return;
      const status = sub as { allowedKits?: number; tierName?: string } | undefined;
      if (Array.isArray(list)) setKits(list);
      setAllowedKits(status?.allowedKits ?? 0);
      setHasSubscription((status?.allowedKits ?? 0) > 0);
      setTierName(status?.tierName ?? null);
      setSubscriptionLoaded(true);
    }).catch(() => { if (!cancelled) setSubscriptionLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function handleFinish() {
    setFinishing(true);
    try {
      const res = await fetch("/api/me/onboarding-complete", { method: "POST", credentials: "include" });
      if (res.ok) { router.replace("/dashboard"); router.refresh(); }
      else setFinishing(false);
    } catch { setFinishing(false); }
  }

  async function handleBrandFinish() {
    setBrandError(null);
    setBrandSaving(true);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: brandCompany.trim(),
          industry: brandIndustry.trim(),
          budgetRange: brandBudget,
          website: brandWebsite.trim(),
          description: brandDescription.trim(),
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBrandError(err.error ?? "Failed to save brand profile");
        return;
      }
      // Mark onboarding complete then redirect to brand dashboard
      await fetch("/api/me/onboarding-complete", { method: "POST", credentials: "include" });
      router.replace("/brand");
    } catch {
      setBrandError("Something went wrong. Please try again.");
    } finally {
      setBrandSaving(false);
    }
  }

  async function chooseAccountType(type: AccountType) {
    setAccountTypeSaving(true);
    await fetch("/api/me/account-type", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountType: type }),
      credentials: "include",
    }).catch(() => {});
    setAccountType(type);
    setAccountTypeSaving(false);
    if (type === "brand") setBrandStep(1);
  }

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav
        links={[{ href: "/pricing", label: "Pricing" }]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="mx-auto max-w-xl px-5 pb-24 pt-28 sm:px-8">
        {/* Header */}
        <div className="mb-10">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Getting started
          </p>
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            Welcome to Kitevo
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {accountType === "brand"
              ? "Set up your brand profile to start finding creators."
              : "Four quick steps to your first live media kit."}
          </p>
        </div>

        {/* ── ROLE PICKER (step 0 — shown until type is chosen) ── */}
        {(accountTypeLoading || !accountType) && (
          <div className="bg-background border-border rounded-2xl border p-8 shadow-sm">
            {accountTypeLoading ? (
              <p className="text-muted-foreground text-sm text-center">Loading…</p>
            ) : (
              <>
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-2">
                  Step 0 of setup
                </p>
                <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
                  Who are you on Kitevo?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground mb-8">
                  This shapes your entire experience — choose carefully.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Creator card */}
                  <button
                    type="button"
                    disabled={accountTypeSaving}
                    onClick={() => chooseAccountType("creator")}
                    className="group relative text-left rounded-2xl border-2 border-border hover:border-foreground transition-all duration-150 p-6 space-y-3 disabled:opacity-60"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white">
                      {/* Video camera — creator */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14"/>
                        <rect x="3" y="8" width="12" height="8" rx="2"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-base">Creator</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        I create content — Instagram, YouTube, TikTok, blogs. I want a media kit to pitch to brands.
                      </p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Get a kit
                    </p>
                  </button>

                  {/* Brand card */}
                  <button
                    type="button"
                    disabled={accountTypeSaving}
                    onClick={() => chooseAccountType("brand")}
                    className="group relative text-left rounded-2xl border-2 border-border hover:border-foreground transition-all duration-150 p-6 space-y-3 disabled:opacity-60"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white">
                      {/* Briefcase — brand */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                        <line x1="12" y1="12" x2="12" y2="12.01"/>
                        <path d="M2 12h8m4 0h8"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-base">Brand</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        I represent a company. I want to discover creators, review their kits, and hire them for campaigns.
                      </p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Find creators
                    </p>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BRAND ONBOARDING FLOW ── */}
        {accountType === "brand" && brandStep === 1 && (
          <div className="bg-background border-border rounded-2xl border p-6 shadow-sm space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-1">
                Brand profile
              </p>
              <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
                Tell creators about your brand
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                This is how creators will see you when you reach out.
              </p>
            </div>

            {brandError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {brandError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Company name *</label>
                <Input value={brandCompany} onChange={setBrandCompany} placeholder="Acme Co." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Industry *</label>
                <select
                  value={brandIndustry}
                  onChange={(e) => setBrandIndustry(e.target.value)}
                  className="border-border bg-background text-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select industry…</option>
                  {["Fashion & Apparel", "Beauty & Skincare", "Food & Beverage", "Tech & SaaS", "Health & Wellness",
                    "Travel & Hospitality", "Home & Lifestyle", "Sports & Fitness", "Entertainment", "Finance", "Education", "Other"].map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Typical campaign budget *</label>
                <select
                  value={brandBudget}
                  onChange={(e) => setBrandBudget(e.target.value)}
                  className="border-border bg-background text-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select range…</option>
                  {["< $500", "$500–$2k", "$2k–$10k", "$10k–$50k", "$50k+"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Website</label>
                <Input value={brandWebsite} onChange={setBrandWebsite} placeholder="https://yourcompany.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">What are you looking for?</label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  rows={3}
                  placeholder="We partner with lifestyle creators for product launches and seasonal campaigns…"
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setAccountType(null); setBrandStep(0); }}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Change role
              </button>
              <button
                type="button"
                disabled={brandSaving || !brandCompany.trim() || !brandIndustry || !brandBudget}
                onClick={handleBrandFinish}
                className="bg-foreground text-background inline-flex h-11 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ml-auto"
              >
                {brandSaving ? "Saving…" : "Enter Kitevo"}
              </button>
            </div>
          </div>
        )}

        {/* ── CREATOR FLOW (step indicators + step card) ── */}
        {accountType === "creator" && <><div className="mb-8 flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      done || active
                        ? "bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground border"
                    }`}
                  >
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : s.number}
                  </div>
                  <span className={`hidden text-[10px] font-medium sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.short}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mb-5 h-px flex-1 transition-colors ${i < currentStep ? "bg-foreground" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step card */}
        <div className="bg-background border-border rounded-2xl border p-6 shadow-sm">
          <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
            {STEPS[currentStep].title}
          </h2>

          {/* ── Step 1: Profile ── */}
          {currentStep === 0 && (
            <div className="mt-5">
              {profileLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : (
                <ProfileForm
                  formId="onboarding-profile-form"
                  hideSubmitButton
                  profile={profile ?? emptyProfile}
                  externalError={profileSaveError}
                  onAvatarUrlChange={(url) =>
                    setProfile((p) => (p ? { ...p, avatarUrl: url } : { ...emptyProfile, avatarUrl: url }))
                  }
                  onSave={async (data) => {
                    setProfileSaveError(null);
                    setProfileSaving(true);
                    try {
                      const res = await fetch("/api/me/profile", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                        credentials: "include",
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setProfile((p) => (p ? { ...p, ...updated } : null));
                        setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setProfileSaveError(err.error ?? "Failed to save profile");
                      }
                    } finally { setProfileSaving(false); }
                  }}
                  saving={profileSaving}
                  submitLabel="Save & continue"
                />
              )}
            </div>
          )}

          {/* ── Step 2: Connect platforms ── */}
          {currentStep === 1 && (
            <div className="mt-5 space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Connect your platforms so your kit shows live stats, posts, and videos. Both are optional — you can connect later from your dashboard.
              </p>

              {platformsLoading ? (
                <p className="text-muted-foreground text-sm">Checking connections…</p>
              ) : (
                <div className="space-y-3">
                  <PlatformRow
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#ig-ob-grad)" aria-hidden>
                        <defs>
                          <linearGradient id="ig-ob-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f09433"/>
                            <stop offset="50%" stopColor="#dc2743"/>
                            <stop offset="100%" stopColor="#bc1888"/>
                          </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    }
                    name="Instagram"
                    description="Followers, engagement rate, Reels grid"
                    connected={instagramConnected}
                    connectHref="/api/instagram/connect?return_to=onboarding"
                    connectLabel="Connect"
                    error={
                      searchParams.get("instagram_error")
                        ? (instagramErrors[searchParams.get("instagram_error")!] ?? `Error: ${searchParams.get("instagram_error")}`)
                        : null
                    }
                  />

                  <PlatformRow
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000" aria-hidden>
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    }
                    name="YouTube"
                    description="Subscribers, total views, video grid"
                    connected={youtubeConnected}
                    connectHref="/api/youtube/connect?return_to=onboarding"
                    connectLabel="Connect"
                    error={
                      searchParams.get("youtube") === "error"
                        ? "Something went wrong connecting YouTube. Try again."
                        : searchParams.get("youtube") === "no_channel"
                          ? "No YouTube channel found on your Google account."
                          : null
                    }
                  />
                </div>
              )}

              {(instagramConnected || youtubeConnected) && (
                <p className="text-xs text-green-700 font-medium">
                  {[instagramConnected && "Instagram", youtubeConnected && "YouTube"].filter(Boolean).join(" & ")} connected ✓
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Choose a plan ── */}
          {currentStep === 2 && (
            <div className="mt-5">
              {/* Access, not payment: a comp sets tierName without hasSubscription, and a
                  comped creator must see "you're on Pro", not the Subscribe buttons. */}
              {tierName && tierName !== "Free" ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    You&apos;re on <span className="font-semibold">{tierName}</span>. Hit Next to create your first kit.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscribeError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {subscribeError}
                    </div>
                  )}

                  {/* Free tier — always first */}
                  <div className="rounded-2xl border border-border p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-foreground font-semibold">Free</p>
                        <p className="text-muted-foreground text-xs mt-0.5">1 kit · basic profile · manual stats & brands</p>
                      </div>
                      <span className="text-foreground text-xl font-semibold tabular-nums">$0</span>
                    </div>
                    <button
                      type="button"
                      disabled={subscribeLoadingTier !== null}
                      onClick={() => setCurrentStep(3)}
                      className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Start for free
                    </button>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      Live platform stats, growth charts, and advanced styling require a paid plan.
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">or upgrade</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Paid tiers */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {getPublicTiers().filter((t: SubscriptionTier) => t.priceMonthly > 0).map((tier: SubscriptionTier) => (
                      <div
                        key={tier.id}
                        className={`relative rounded-2xl border p-5 ${tier.highlight ? "border-foreground" : "border-border"}`}
                      >
                        {tier.highlight && (
                          <span className="bg-foreground text-background absolute -top-3 left-4 rounded-full px-3 py-0.5 text-[10px] font-semibold tracking-wide">
                            Most popular
                          </span>
                        )}
                        <p className="text-foreground text-base font-semibold">{tier.name}</p>
                        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
                          ${tier.priceMonthly}
                          <span className="text-muted-foreground text-sm font-normal">/mo</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {tier.kitsAllowed} kit{tier.kitsAllowed !== 1 ? "s" : ""}
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs">
                          {tier.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="text-muted-foreground flex items-center gap-1.5">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground shrink-0" aria-hidden>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          disabled={subscribeLoadingTier !== null}
                          onClick={async () => {
                            setSubscribeError(null);
                            setSubscribeLoadingTier(tier.id);
                            try {
                              const res = await fetch("/api/create-checkout-session", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tierId: tier.id, returnTo: "onboarding" }),
                                credentials: "include",
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Failed to start checkout");
                              if (data.url) window.location.href = data.url;
                            } catch (e) {
                              setSubscribeError(e instanceof Error ? e.message : "Something went wrong");
                            } finally { setSubscribeLoadingTier(null); }
                          }}
                          className={`mt-4 inline-flex h-9 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
                            tier.highlight
                              ? "bg-foreground text-background"
                              : "border-border text-foreground border hover:bg-muted"
                          }`}
                        >
                          {subscribeLoadingTier === tier.id ? "Redirecting…" : `Get ${tier.name}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Create kit ── */}
          {currentStep === 3 && (
            <div className="mt-5">
              {!subscriptionLoaded ? (
                <p className="text-muted-foreground text-sm">Checking your plan…</p>
              ) : allowedKits === 0 ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    You need an active plan to create a kit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    Choose a plan
                  </button>
                </div>
              ) : kits.length > 0 || kitCreated ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    {kitCreated ? "Kit created!" : `You already have ${kits.length} kit${kits.length !== 1 ? "s" : ""}.`} Click Go to Dashboard to finish.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Give your kit a name and a URL. You can customise everything from the dashboard.
                  </p>
                  <Input
                    value={newKitName}
                    onChange={setNewKitName}
                    placeholder="Kit name (e.g. Fashion & Lifestyle)"
                  />
                  <Input
                    value={newKitSlug}
                    onChange={setNewKitSlug}
                    placeholder="URL slug (e.g. my-fashion-kit)"
                  />
                  {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                  <button
                    type="button"
                    disabled={!newKitSlug.trim() || createKitLoading}
                    onClick={async () => {
                      if (!newKitSlug.trim()) return;
                      setAddKitError("");
                      setCreateKitLoading(true);
                      try {
                        const res = await fetch("/api/kits", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ slug: newKitSlug.trim(), name: newKitName.trim() }),
                          credentials: "include",
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.id) {
                          setNewKitName("");
                          setNewKitSlug("");
                          setKitCreated(true);
                          setKits((prev) => [...prev, { id: data.id, name: data.name ?? newKitName, slug: data.slug ?? newKitSlug }]);
                        } else {
                          setAddKitError(data.error ?? "Failed to create kit");
                        }
                      } finally { setCreateKitLoading(false); }
                    }}
                    className="bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {createKitLoading ? "Creating…" : "Create kit"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={finishing}
              className="bg-foreground text-background inline-flex h-11 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {finishing ? "Taking you there…" : "Go to Dashboard"}
            </button>
          ) : currentStep === 0 ? (
            // Profile step — button submits the form (triggers validation + save)
            <button
              type="submit"
              form="onboarding-profile-form"
              disabled={profileSaving}
              className="bg-foreground text-background inline-flex h-11 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {profileSaving ? "Saving…" : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="bg-foreground text-background inline-flex h-11 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80"
            >
              {currentStep === 1 && !instagramConnected && !youtubeConnected ? "Skip for now" : "Next"}
            </button>
          )}
        </div>

        {currentStep === 1 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            You can also connect platforms later from your dashboard.{" "}
            <Link href="/help/instagram" target="_blank" className="hover:text-foreground underline">
              Need help?
            </Link>
          </p>
        )}
        </>}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
