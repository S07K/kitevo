"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SiInstagram, SiInstagramHex, SiYoutube, SiYoutubeHex } from "@icons-pack/react-simple-icons";
import { ArrowLeft, ArrowRight, Check, Copy, Gift, Loader2, Megaphone, Sparkles, X } from "lucide-react";
import { AppNav } from "../components/AppNav";
import { CREATOR_NICHES, MAX_NICHES } from "@/lib/niches";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";
import { KitPreview } from "./KitPreview";

/**
 * Onboarding.
 *
 * Creators: three short steps — You (name, username, niches) → Connect (optional) → Your
 * kit is live. The kit is created automatically at the end of step 1 (slug = username),
 * so nobody types a URL slug, and there is no plan step: everyone starts on Free (or
 * their comp) and upgrades later, after they've seen their kit. A live phone preview
 * sits beside the form.
 *
 * Brands: one screen (company, industry, budget) → Discover.
 */

type AccountType = "creator" | "brand";
type Step = 0 | 1 | 2;
type UsernameState = { status: "idle" | "checking" | "ok" | "error"; message?: string };

const STEPS = ["You", "Connect", "Your kit"] as const;

const INDUSTRIES = [
  "Fashion & Apparel", "Beauty & Skincare", "Food & Beverage", "Tech & SaaS", "Health & Wellness",
  "Travel & Hospitality", "Home & Lifestyle", "Sports & Fitness", "Entertainment", "Finance", "Education", "Other",
];
const BUDGETS = ["< $500", "$500–$2k", "$2k–$10k", "$10k–$50k", "$50k+"];

const INSTAGRAM_ERRORS: Record<string, string> = {
  not_configured: "Instagram connect isn't configured on this server.",
  invalid: "That request expired. Try connecting again.",
  no_pages: "We couldn't find a Facebook Page on your account. Instagram's API needs your Instagram account linked to a Facebook Page.",
  permission_denied: "Some permissions were declined. Connect again and allow everything Kitevo asks for.",
  no_instagram_account: "Your Facebook Page isn't linked to an Instagram Business or Creator account yet.",
  server: "Something went wrong on our side. Try again.",
  access_denied: "You cancelled the Instagram connection.",
};

const inputCls =
  "mt-1.5 w-full h-11 px-3.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-ring/10 transition";
const labelCls = "text-[13px] font-medium text-foreground";
const primaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-40";
const secondaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-7 text-sm font-medium text-foreground transition-colors hover:bg-muted";
const ghostBtn = "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const oauthReturn = params.get("instagram_connected") === "1" || !!params.get("instagram_error") || !!params.get("youtube");

  const [booting, setBooting] = useState(true);
  const [accountType, setAccountType] = useState<AccountType | null>(oauthReturn ? "creator" : null);
  const [step, setStep] = useState<Step>(oauthReturn ? 1 : 0);

  // Creator profile
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [uState, setUState] = useState<UsernameState>({ status: "idle" });
  const [niches, setNiches] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platforms + plan
  const [igConnected, setIgConnected] = useState(false);
  const [ytConnected, setYtConnected] = useState(false);
  const [tierId, setTierId] = useState<string | null>(null);

  // Kit + finish
  const [kit, setKit] = useState<{ id: string; slug: string } | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<"kit" | "ref" | null>(null);
  const completedRef = useRef(false);

  // Brand
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [budget, setBudget] = useState("");

  // ── Boot: profile, existing brand profile, kits, plan, connections ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const get = (u: string, init?: RequestInit) =>
        fetch(u, { credentials: "include", ...init }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const [profile, brand, kits, sub, ig, yt] = await Promise.all([
        get("/api/me/profile"),
        get("/api/brand/profile"),
        get("/api/kits"),
        get("/api/subscription-status", { method: "POST" }),
        get("/api/instagram/status"),
        get("/api/youtube/stats"),
      ]);
      if (cancelled) return;
      if (profile) {
        setName(profile.name ?? "");
        setNiches(Array.isArray(profile.niches) ? profile.niches : []);
        setAvatarUrl(profile.avatarUrl ?? null);
        if (profile.username) {
          setUsername(profile.username);
          setSavedUsername(profile.username);
          setUState({ status: "ok" });
        }
      }
      // A filled brand profile means they already chose Brand (e.g. refreshed mid-flow).
      // "creator" is never restored from the DB default, so new users always see the picker.
      if (brand?.companyName) {
        setAccountType("brand");
        setCompany(brand.companyName ?? "");
        setIndustry(brand.industry ?? "");
        setBudget(brand.budgetRange ?? "");
      }
      if (Array.isArray(kits) && kits[0]) setKit({ id: kits[0].id, slug: kits[0].slug });
      setTierId(sub?.tierId ?? null);
      setIgConnected(ig?.connected === true);
      setYtConnected(!!yt && typeof yt === "object" && "subscriberCount" in yt);
      if (!profile?.username) {
        const s = await get("/api/me/username-suggest");
        if (!cancelled && s?.username) setUsername(s.username);
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Back from hosted checkout (older links): refresh plan, drop the query string.
  useEffect(() => {
    if (params.get("success") === "true" && (params.get("session_id") || params.get("subscription_id"))) {
      const sessionId = params.get("session_id");
      fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(sessionId && sessionId !== "{CHECKOUT_SESSION_ID}" ? { session_id: sessionId } : {}),
          ...(params.get("subscription_id") ? { subscription_id: params.get("subscription_id") } : {}),
        }),
        credentials: "include",
      }).finally(() => router.replace("/onboarding", { scroll: false }));
    }
  }, [params, router]);

  // ── Live username availability (debounced) ──
  useEffect(() => {
    if (booting) return;
    const u = username.trim().toLowerCase();
    if (!u) {
      setUState({ status: "error", message: "Pick a username" });
      return;
    }
    if (u === savedUsername) {
      setUState({ status: "ok" });
      return;
    }
    setUState({ status: "checking" });
    const t = setTimeout(async () => {
      const r = await fetch(`/api/me/username-check?username=${encodeURIComponent(u)}`, { credentials: "include" })
        .then((x) => x.json())
        .catch(() => null);
      setUState(r?.available ? { status: "ok" } : { status: "error", message: r?.error ?? "Couldn't check that username" });
    }, 350);
    return () => clearTimeout(t);
  }, [username, savedUsername, booting]);

  const chooseType = async (type: AccountType) => {
    setAccountType(type);
    await fetch("/api/me/account-type", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountType: type }),
      credentials: "include",
    }).catch(() => {});
  };

  /** Create the creator's first kit at /kit/<username> (falls back if the slug is taken). */
  const ensureKit = useCallback(async (uname: string, displayName: string) => {
    if (kit) return kit;
    const kitName = displayName.trim() ? `${displayName.trim()}'s Media Kit` : "My Media Kit";
    for (const slug of [uname, `${uname}-kit`, `${uname}-${Math.floor(100 + Math.random() * 900)}`]) {
      const res = await fetch("/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: kitName }),
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        const k = { id: d.id as string, slug: d.slug as string };
        setKit(k);
        return k;
      }
      if (res.status !== 409) break;
    }
    return null;
  }, [kit]);

  const saveProfile = async () => {
    setError(null);
    setSaving(true);
    try {
      const u = username.trim().toLowerCase();
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), username: u, niches }),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Couldn't save your profile.");
      }
      setSavedUsername(u);
      const k = await ensureKit(u, name);
      if (!k) throw new Error("Your profile is saved, but we couldn't create your kit. You can create it from the dashboard.");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // Entering the final step = onboarding done (also tracked server-side).
  useEffect(() => {
    if (step !== 2 || completedRef.current) return;
    completedRef.current = true;
    fetch("/api/me/onboarding-complete", { method: "POST", credentials: "include" }).catch(() => {});
    fetch("/api/referrals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.code && setReferralCode(d.code))
      .catch(() => {});
  }, [step]);

  const saveBrand = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company.trim(), industry, budgetRange: budget }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save your brand profile.");
      await fetch("/api/me/onboarding-complete", { method: "POST", credentials: "include" });
      router.replace("/discover");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  };

  const copy = async (what: "kit" | "ref", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const kitUrl = kit ? `${origin}/kit/${kit.slug}` : "";
  const host = origin.replace(/^https?:\/\//, "");
  const igError = params.get("instagram_error");
  const ytError = params.get("youtube");

  // ── Render ──
  if (booting) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={22} aria-label="Loading" />
        </div>
      </Shell>
    );
  }

  /* Role picker */
  if (!accountType) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Welcome to Kitevo</p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-tight text-foreground">
            What brings you here?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">This sets up the right workspace for you.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              {
                type: "creator" as const,
                Icon: Sparkles,
                title: "I'm a creator",
                body: "Build a live media kit and get brand deals.",
                cta: "Takes about 2 minutes",
              },
              {
                type: "brand" as const,
                Icon: Megaphone,
                title: "I'm a brand",
                body: "Find creators, post campaigns and message them.",
                cta: "Takes about 1 minute",
              },
            ].map((o) => (
              <button
                key={o.type}
                type="button"
                onClick={() => chooseType(o.type)}
                className="group flex flex-col items-start rounded-2xl border border-border bg-background p-6 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <o.Icon size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-5 text-lg font-semibold text-foreground">{o.title}</span>
                <span className="mt-1 text-sm text-muted-foreground">{o.body}</span>
                <span className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {o.cta} <ArrowRight size={13} aria-hidden />
                </span>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  /* Brand */
  if (accountType === "brand") {
    return (
      <Shell>
        <div className="mx-auto max-w-xl pt-6">
          <button type="button" onClick={() => setAccountType(null)} className={`${ghostBtn} -ml-4`}>
            <ArrowLeft size={15} aria-hidden /> Back
          </button>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">Set up your brand</h1>
          <p className="mt-2 text-sm text-muted-foreground">Creators see this when you reach out. You can add your logo and website in settings.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBrand();
            }}
            className="mt-8 space-y-5 rounded-2xl border border-border bg-background p-6"
          >
            <label className="block">
              <span className={labelCls}>Company name</span>
              <input required autoFocus value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Co." className={inputCls} />
            </label>
            <div>
              <span className={labelCls}>Industry</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <Chip key={i} on={industry === i} onClick={() => setIndustry(i)}>
                    {i}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <span className={labelCls}>Typical campaign budget</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <Chip key={b} on={budget === b} onClick={() => setBudget(b)}>
                    {b}
                  </Chip>
                ))}
              </div>
            </div>
            {error && <ErrorNote text={error} />}
            <button type="submit" disabled={saving || !company.trim() || !industry || !budget} className={`${primaryBtn} w-full`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? "Setting up…" : "Start finding creators"}
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  /* Creator */
  const canContinue = name.trim().length > 0 && uState.status === "ok" && !saving;

  return (
    <Shell>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div className="min-w-0 max-w-xl">
          <Progress step={step} />

          {/* Step 1 — You */}
          {step === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canContinue) saveProfile();
              }}
            >
              <h1 className="mt-8 font-display text-[clamp(28px,4vw,38px)] font-semibold leading-tight tracking-tight text-foreground">
                Let&apos;s make your media kit
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">A few quick details. You can change everything later.</p>

              <div className="mt-8 space-y-6">
                <label className="block">
                  <span className={labelCls}>Your name</span>
                  <input
                    required
                    autoFocus={!name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How brands will see you"
                    autoComplete="name"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className={labelCls}>Your link</span>
                  <div
                    className={`mt-1.5 flex h-11 items-center rounded-xl border bg-background pl-3.5 pr-3 transition focus-within:ring-4 focus-within:ring-ring/10 ${
                      uState.status === "error" ? "border-red-400" : uState.status === "ok" ? "border-green-500/60" : "border-border"
                    }`}
                  >
                    <span className="shrink-0 text-sm text-muted-foreground">{host}/kit/</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      spellCheck={false}
                      autoCapitalize="none"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
                      aria-describedby="username-status"
                    />
                    <span className="ml-2 shrink-0" aria-hidden>
                      {uState.status === "checking" && <Loader2 size={15} className="animate-spin text-muted-foreground" />}
                      {uState.status === "ok" && <Check size={16} className="text-green-600" />}
                      {uState.status === "error" && <X size={16} className="text-red-500" />}
                    </span>
                  </div>
                  <p id="username-status" className={`mt-1.5 text-xs ${uState.status === "error" ? "text-red-600" : "text-muted-foreground"}`}>
                    {uState.status === "error" ? uState.message : uState.status === "ok" ? "Nice, that's yours." : "Checking…"}
                  </p>
                </label>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className={labelCls}>What do you create?</span>
                    <span className="text-xs text-muted-foreground">
                      {niches.length}/{MAX_NICHES} · helps brands find you
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {CREATOR_NICHES.map((n) => {
                      const on = niches.includes(n);
                      return (
                        <Chip
                          key={n}
                          on={on}
                          disabled={!on && niches.length >= MAX_NICHES}
                          onClick={() => setNiches((cur) => (on ? cur.filter((x) => x !== n) : [...cur, n]))}
                        >
                          {n}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </div>

              {error && <ErrorNote text={error} />}

              <div className="mt-10 flex items-center justify-between">
                <button type="button" onClick={() => setAccountType(null)} className={`${ghostBtn} -ml-4`}>
                  <ArrowLeft size={15} aria-hidden /> Back
                </button>
                <button type="submit" disabled={!canContinue} className={primaryBtn}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {saving ? "Creating your kit…" : "Continue"}
                  {!saving && <ArrowRight size={16} aria-hidden />}
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Connect */}
          {step === 1 && (
            <div>
              <h1 className="mt-8 font-display text-[clamp(28px,4vw,38px)] font-semibold leading-tight tracking-tight text-foreground">
                Connect your accounts
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Brands trust numbers they can verify. Connect once and your kit stays up to date by itself. Optional, and you can do it later.
              </p>

              <div className="mt-8 space-y-3">
                <PlatformCard
                  Icon={SiInstagram}
                  color={SiInstagramHex}
                  name="Instagram"
                  detail="Followers, engagement, audience and your latest Reels"
                  connected={igConnected}
                  href="/api/instagram/connect?return_to=onboarding"
                  error={igError ? (INSTAGRAM_ERRORS[igError] ?? "Couldn't connect Instagram. Try again.") : null}
                >
                  {!igConnected && (
                    <details className="group mt-3 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground" open={!!igError}>
                      <summary className="cursor-pointer list-none font-medium text-foreground">
                        Before you connect <span className="text-muted-foreground group-open:hidden">· 2 requirements</span>
                      </summary>
                      <ul className="mt-2 space-y-1.5">
                        <li className="flex gap-2">
                          <Check size={13} className="mt-0.5 shrink-0" aria-hidden /> Your Instagram is a <b className="font-medium text-foreground">Creator</b> or{" "}
                          <b className="font-medium text-foreground">Business</b> account (Settings → Account type)
                        </li>
                        <li className="flex gap-2">
                          <Check size={13} className="mt-0.5 shrink-0" aria-hidden /> It&apos;s linked to a <b className="font-medium text-foreground">Facebook Page</b> you manage
                        </li>
                      </ul>
                      <Link href="/help/instagram" target="_blank" className="mt-2 inline-block underline underline-offset-2 hover:text-foreground">
                        Step-by-step guide
                      </Link>
                    </details>
                  )}
                </PlatformCard>
                <PlatformCard
                  Icon={SiYoutube}
                  color={SiYoutubeHex}
                  name="YouTube"
                  detail="Subscribers, total views and your latest videos"
                  connected={ytConnected}
                  href="/api/youtube/connect?return_to=onboarding"
                  error={
                    ytError === "error"
                      ? "Couldn't connect YouTube. Try again."
                      : ytError === "no_channel"
                        ? "That Google account doesn't have a YouTube channel."
                        : null
                  }
                />
              </div>

              {tierId === "free" && (igConnected || ytConnected) && (
                <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  Connected. On the Free plan your public kit shows the numbers you enter yourself; live, auto-updating stats on your
                  kit are part of <Link href="/pricing" className="font-medium text-foreground underline underline-offset-2">Starter</Link>.
                </p>
              )}

              <div className="mt-10 flex items-center justify-between">
                <button type="button" onClick={() => setStep(0)} className={`${ghostBtn} -ml-4`}>
                  <ArrowLeft size={15} aria-hidden /> Back
                </button>
                <button type="button" onClick={() => setStep(2)} className={igConnected || ytConnected ? primaryBtn : secondaryBtn}>
                  {igConnected || ytConnected ? "Continue" : "Skip for now"} <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Live */}
          {step === 2 && (
            <div>
              <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                <Check size={24} strokeWidth={2.5} aria-hidden />
              </span>
              <h1 className="mt-5 font-display text-[clamp(28px,4vw,38px)] font-semibold leading-tight tracking-tight text-foreground">
                Your media kit is live
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Share it with brands, put it in your bio, add it to your email signature.
              </p>

              {kit && (
                <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border bg-background p-2 pl-4">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{kitUrl.replace(/^https?:\/\//, "")}</span>
                  <button type="button" onClick={() => copy("kit", kitUrl)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85">
                    {copied === "kit" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                    {copied === "kit" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={kit ? `/kit/edit?id=${encodeURIComponent(kit.id)}` : "/dashboard"}
                  className="flex flex-col rounded-2xl border border-border bg-background p-5 transition-colors hover:border-foreground/40"
                >
                  <span className="text-sm font-semibold text-foreground">Make it yours</span>
                  <span className="mt-1 text-xs text-muted-foreground">Pick a style, add rates, past brands and your numbers.</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    Open editor <ArrowRight size={13} aria-hidden />
                  </span>
                </Link>
                <Link
                  href={kit ? `/kit/${kit.slug}` : "/dashboard"}
                  target="_blank"
                  className="flex flex-col rounded-2xl border border-border bg-background p-5 transition-colors hover:border-foreground/40"
                >
                  <span className="text-sm font-semibold text-foreground">See it as a brand would</span>
                  <span className="mt-1 text-xs text-muted-foreground">Opens your public kit in a new tab.</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    View kit <ArrowRight size={13} aria-hidden />
                  </span>
                </Link>
              </div>

              {referralCode && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary p-5 text-primary-foreground">
                  <Gift size={20} className="mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Know other creators? Earn {REFERRAL_RATE_PCT}% when they join.</p>
                    <p className="mt-1 text-xs opacity-70">
                      Share your invite link. When a creator you invite upgrades, you get {REFERRAL_RATE_PCT}% of what they pay for a year.
                    </p>
                    <button
                      type="button"
                      onClick={() => copy("ref", `${origin}/?ref=${referralCode}`)}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-background px-4 text-xs font-medium text-foreground transition-opacity hover:opacity-85"
                    >
                      {copied === "ref" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                      {copied === "ref" ? "Invite link copied" : "Copy invite link"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-10">
                <Link href="/dashboard" className={primaryBtn}>
                  Go to my dashboard <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Live preview */}
        <aside className={step === 2 ? "block" : "hidden lg:block"}>
          <div className="lg:sticky lg:top-24">
            <KitPreview
              name={name}
              username={kit?.slug ?? username}
              niches={niches}
              avatarUrl={avatarUrl}
              instagramConnected={igConnected}
              youtubeConnected={ytConnected}
              host={host || undefined}
            />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <AppNav />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-24 sm:px-8">{children}</main>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full bg-primary transition-all duration-500 ${i <= step ? "w-full" : "w-0"}`} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        Step {step + 1} of {STEPS.length} · <span className="text-foreground">{STEPS[step]}</span>
      </p>
    </div>
  );
}

function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function PlatformCard({
  Icon,
  color,
  name,
  detail,
  connected,
  href,
  error,
  children,
}: {
  Icon: typeof SiInstagram;
  color: string;
  name: string;
  detail: string;
  connected: boolean;
  href: string;
  error: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-background p-5 transition-colors ${connected ? "border-green-500/40" : "border-border"}`}>
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon size={22} color={color} title={name} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        {connected ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
            <Check size={13} aria-hidden /> Connected
          </span>
        ) : (
          <a href={href} className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-85">
            Connect
          </a>
        )}
      </div>
      {error && <ErrorNote text={error} />}
      {children}
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {text}
    </p>
  );
}
