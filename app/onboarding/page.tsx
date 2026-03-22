"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { getPublicTiers } from "@/config/subscriptions";
import type { SubscriptionTier } from "@/config/subscriptions";

const steps = [
  {
    title: "Complete your profile",
    description: "Add your name, username, bio and links. Your username is used for your public kit URL. You’ll do this on your dashboard next.",
  },
  {
    title: "Connect Instagram",
    description: "Link your Instagram Business or Creator account to show live follower stats and recent posts.",
  },
  {
    title: "Subscribe",
    description: "Choose a plan so you can create and publish your media kits.",
  },
  {
    title: "Create your first kit",
    description: "Create a media kit with your work samples, rates and brands. You can edit it anytime.",
  },
];

const totalSteps = steps.length;

const emptyProfile: ProfileFormProfile = {
  name: null,
  username: null,
  bio: null,
  avatarUrl: null,
  links: [],
};

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
  const [allowedKits, setAllowedKits] = useState(1);
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
    if (connected === "1" || err) {
      setCurrentStep(1);
    }
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
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setHasSubscription((data.allowedKits ?? 0) > 0);
            setTierName(data.tierName ?? null);
            setAllowedKits(data.allowedKits ?? 1);
          }
        })
        .finally(() => {
          router.replace("/onboarding", { scroll: false });
        });
    }
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setProfile(data);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 1) return;
    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setInstagramConnected(data.connected === true));
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 2 && currentStep !== 3) return;
    Promise.all([
      fetch("/api/kits", { credentials: "include" }).then(async (r) => (r.ok ? r.json() : null)),
      fetch("/api/subscription-status", { method: "POST", credentials: "include" }).then((r) => (r.ok ? r.json() : {})),
    ]).then(([list, sub]) => {
      const status = sub as { allowedKits?: number; tierName?: string } | undefined;
      if (Array.isArray(list)) setKits(list);
      setAllowedKits(status?.allowedKits ?? 1);
      setHasSubscription((status?.allowedKits ?? 0) > 0);
      setTierName(status?.tierName ?? null);
    });
  }, [currentStep]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isStep1 = currentStep === 0;
  const isStep2 = currentStep === 1;
  const isStep3 = currentStep === 2;
  const isStep4 = currentStep === 3;

  async function handleFinish() {
    setFinishing(true);
    try {
      const res = await fetch("/api/me/onboarding-complete", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setFinishing(false);
      }
    } catch {
      setFinishing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/pricing", label: "Pricing" },
        ]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-[#1A1A1A]">
          Welcome to Media Kit Pro
        </h1>
        <p className="mt-2 text-[#5C5C5C]">
          Step {currentStep + 1} of {totalSteps}
        </p>

        {/* Progress bar */}
        <div className="mt-6 flex gap-1" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= currentStep ? "#1A1A1A" : "#E8E6E3" }}
            />
          ))}
        </div>

        {/* Step 1: inline profile form; other steps: info only */}
        <div className="mt-10 p-6 border border-[#E8E6E3] rounded-lg bg-white">
          <span className="text-xs font-medium uppercase tracking-wider text-[#8C8C8C]">
            Step {currentStep + 1}
          </span>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#1A1A1A]">
            {step.title}
          </h2>
          <p className="mt-2 text-[#5C5C5C]">
            {step.description}
          </p>
          {isStep1 ? (
            <>
              {profileSaveError && (
                <p className="mt-3 text-sm text-red-600">{profileSaveError}</p>
              )}
              {profileLoading ? (
                <p className="mt-4 text-sm text-[#5C5C5C]">Loading…</p>
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
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  saving={profileSaving}
                  submitLabel="Save & continue"
                />
              )}
            </>
          ) : isStep2 ? (
            <div className="mt-4">
              {searchParams.get("instagram_error") && (
                <p className="mb-3 text-sm text-red-600">
                  {{
                    not_configured: "Instagram connect is not configured.",
                    invalid: "Invalid or expired request. Try connecting again.",
                    no_pages: "No Facebook Page found. Create a Page and try again.",
                    permission_denied: "Access was declined. Grant all permissions when prompted.",
                    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
                    server: "Something went wrong. Try again later.",
                    access_denied: "You declined access. Try again to connect.",
                  }[searchParams.get("instagram_error")!] ?? `Error: ${searchParams.get("instagram_error")}`}
                </p>
              )}
              {searchParams.get("instagram_connected") === "1" && (
                <p className="mb-3 text-sm text-green-600 font-medium">Instagram connected successfully.</p>
              )}
              <p className="text-sm text-[#5C5C5C]">
                Connect your Instagram Business or Creator account to show live follower stats and pick posts for your kit.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {instagramConnected ? (
                  <p className="text-sm text-green-600 font-medium">Connected</p>
                ) : (
                  <a
                    href="/api/instagram/connect?return_to=onboarding"
                    className="inline-block px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
                  >
                    Connect Instagram
                  </a>
                )}
                <Link
                  href="/help/instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#5C5C5C] hover:text-[#1A1A1A] hover:underline"
                >
                  Connection help
                </Link>
              </div>
              <p className="mt-3 text-xs text-[#8C8C8C]">
                You’ll be brought back to this page after connecting.
              </p>
            </div>
          ) : isStep3 ? (
            <div className="mt-4">
              {hasSubscription && tierName ? (
                <p className="text-sm text-[#5C5C5C]">You're on <span className="font-medium text-[#1A1A1A]">{tierName}</span>. Click Next to create your first kit.</p>
              ) : (
                <>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Choose a plan below. After payment you'll return here to continue.
                  </p>
                  {subscribeError && <p className="mb-3 text-sm text-red-600">{subscribeError}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getPublicTiers().map((tier: SubscriptionTier) => (
                      <div
                        key={tier.id}
                        className={`p-5 rounded-lg border text-left ${
                          tier.highlight ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A]" : "border-[#E8E6E3]"
                        }`}
                      >
                        {tier.highlight && (
                          <span className="inline-block mb-2 px-2 py-0.5 bg-[#1A1A1A] text-white text-xs font-medium rounded">
                            Most popular
                          </span>
                        )}
                        <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">{tier.name}</h3>
                        <p className="mt-1 text-[#1A1A1A] font-semibold">${tier.priceMonthly}/month</p>
                        <p className="mt-1 text-xs text-[#8C8C8C]">{tier.kitsAllowed} media kit{tier.kitsAllowed !== 1 ? "s" : ""}</p>
                        <ul className="mt-3 space-y-1 text-xs text-[#5C5C5C]">
                          {tier.features.slice(0, 3).map((f, i) => (
                            <li key={i}>✓ {f}</li>
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
                            } finally {
                              setSubscribeLoadingTier(null);
                            }
                          }}
                          className={`mt-4 w-full px-4 py-2 text-sm font-medium rounded-sm disabled:opacity-70 ${
                            tier.highlight ? "bg-[#1A1A1A] text-white hover:bg-[#2D2D2D]" : "border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#FAFAFA]"
                          }`}
                        >
                          {subscribeLoadingTier === tier.id ? "Redirecting…" : `Continue with ${tier.name}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : isStep4 ? (
            <div className="mt-4">
              {kits.length === 0 && allowedKits > 0 ? (
                <>
                  <p className="text-sm text-[#5C5C5C]">
                    Add a name and URL slug to get started. You can add work samples, rates and brands in the editor after.
                  </p>
                  {kitCreated ? (
                    <p className="mt-4 text-sm text-green-600 font-medium">Kit created. Click Go to Dashboard to finish.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Kit name"
                        value={newKitName}
                        onChange={(e) => setNewKitName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                      />
                      <input
                        type="text"
                        placeholder="URL slug (e.g. my-fashion-kit)"
                        value={newKitSlug}
                        onChange={(e) => setNewKitSlug(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
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
                              setKits((prev) => [...prev, { id: data.id, name: data.name ?? newKitName.trim(), slug: data.slug ?? newKitSlug.trim() }]);
                            } else {
                              setAddKitError(data.error ?? "Failed to create kit");
                            }
                          } finally {
                            setCreateKitLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
                      >
                        {createKitLoading ? "Creating…" : "Create kit"}
                      </button>
                    </div>
                  )}
                </>
              ) : allowedKits === 0 ? (
                <p className="text-sm text-[#5C5C5C]">Subscribe first (previous step). Click Back to choose a plan.</p>
              ) : (
                <p className="text-sm text-[#5C5C5C]">You have {kits.length} kit{kits.length !== 1 ? "s" : ""}. Click Go to Dashboard to finish.</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Step navigation */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:text-[#1A1A1A] disabled:opacity-40 disabled:pointer-events-none"
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={finishing}
              className="px-6 py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
            >
              {finishing ? "Taking you there…" : "Go to Dashboard"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="px-6 py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D]"
            >
              Next
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
