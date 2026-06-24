"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { getPublicTiers } from "@/config/subscriptions";
import type { SubscriptionTier } from "@/config/subscriptions";

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { number: "01", title: "Your profile",     short: "Profile" },
  { number: "02", title: "Connect Instagram", short: "Instagram" },
  { number: "03", title: "Choose a plan",    short: "Plan" },
  { number: "04", title: "Create your kit",  short: "Kit" },
];

const totalSteps = STEPS.length;

const emptyProfile: ProfileFormProfile = {
  name: null,
  username: null,
  bio: null,
  avatarUrl: null,
  links: [],
};

// ─── Shared primitives ────────────────────────────────────────────────────────

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

// ─── Main content ─────────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [kits, setKits] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [allowedKits, setAllowedKits] = useState(0);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitSlug, setNewKitSlug] = useState("");
  const [addKitError, setAddKitError] = useState("");
  const [createKitLoading, setCreateKitLoading] = useState(false);
  const [kitCreated, setKitCreated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [tierName, setTierName] = useState<string | null>(null);
  const [subscribeLoadingTier, setSubscribeLoadingTier] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("instagram_connected");
    const err = searchParams.get("instagram_error");
    if (connected === "1" || err) setCurrentStep(1);
  }, [searchParams]);

  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    if (success === "true" && sessionId?.startsWith("cs_")) {
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setProfile(data); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentStep !== 1) return;
    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setInstagramConnected(data.connected === true));
  }, [currentStep]);

  // Always fetch subscription + kits on mount so step 4 has accurate data
  // regardless of which step the user lands on.
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

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  async function handleFinish() {
    setFinishing(true);
    try {
      const res = await fetch("/api/me/onboarding-complete", { method: "POST", credentials: "include" });
      if (res.ok) { router.replace("/dashboard"); router.refresh(); }
      else setFinishing(false);
    } catch { setFinishing(false); }
  }

  const instagramErrors: Record<string, string> = {
    not_configured: "Instagram connect is not configured.",
    invalid: "Invalid or expired request. Try again.",
    no_pages: "No Facebook Page found. Create a Page first.",
    permission_denied: "Access declined — grant all permissions when prompted.",
    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
    server: "Something went wrong. Try again later.",
    access_denied: "You declined access. Connect again.",
  };

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
        {/* ── Header ── */}
        <div className="mb-10">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Getting started
          </p>
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            Welcome to Media Kit Pro
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Four quick steps to your first live media kit.
          </p>
        </div>

        {/* ── Step indicators ── */}
        <div className="mb-8 flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      done
                        ? "bg-foreground text-background"
                        : active
                          ? "bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground border"
                    }`}
                  >
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      s.number
                    )}
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

        {/* ── Step card ── */}
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
              {profileSaveError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {profileSaveError}
                </div>
              )}
              {profileLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : (
                <ProfileForm
                  profile={profile ?? emptyProfile}
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
                  submitLabel="Save & continue →"
                />
              )}
            </div>
          )}

          {/* ── Step 2: Instagram ── */}
          {currentStep === 1 && (
            <div className="mt-5 space-y-4">
              {searchParams.get("instagram_error") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {instagramErrors[searchParams.get("instagram_error")!] ?? `Error: ${searchParams.get("instagram_error")}`}
                </div>
              )}
              {searchParams.get("instagram_connected") === "1" && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 font-medium">
                  Instagram connected successfully.
                </div>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed">
                Connect your Instagram Business or Creator account to show live follower stats, engagement rate, and recent posts on your kit.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {instagramConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                    Connected
                  </span>
                ) : (
                  <a
                    href="/api/instagram/connect?return_to=onboarding"
                    className="bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    Connect Instagram
                  </a>
                )}
                <Link
                  href="/help/instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Connection help →
                </Link>
              </div>
              <p className="text-muted-foreground text-xs">
                You&apos;ll be brought back here after connecting. You can also skip this and connect later from your dashboard.
              </p>
            </div>
          )}

          {/* ── Step 3: Subscribe ── */}
          {currentStep === 2 && (
            <div className="mt-5">
              {hasSubscription && tierName ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    You&apos;re on <span className="font-semibold">{tierName}</span>. Hit Next to create your first kit.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Choose a plan. After payment you&apos;ll return here to continue.
                  </p>
                  {subscribeError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {subscribeError}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {getPublicTiers().map((tier: SubscriptionTier) => (
                      <div
                        key={tier.id}
                        className={`relative rounded-2xl border p-5 ${
                          tier.highlight ? "border-foreground" : "border-border"
                        }`}
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
                          {subscribeLoadingTier === tier.id ? "Redirecting…" : `Continue with ${tier.name}`}
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
                    ← Choose a plan
                  </button>
                </div>
              ) : kits.length > 0 || kitCreated ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    {kitCreated ? "Kit created!" : `You have ${kits.length} kit${kits.length !== 1 ? "s" : ""}.`} Click Go to Dashboard to finish.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Give your kit a name and a URL slug. You can edit content, rates, and work samples in the editor.
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
                    {createKitLoading ? "Creating…" : "Create kit →"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
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
              {finishing ? "Taking you there…" : "Go to Dashboard →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="bg-foreground text-background inline-flex h-11 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80"
            >
              {currentStep === 1 && !instagramConnected ? "Skip for now →" : "Next →"}
            </button>
          )}
        </div>
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
