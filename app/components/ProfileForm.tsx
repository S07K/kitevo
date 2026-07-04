"use client";

import { useState, useEffect, useRef } from "react";
import type { ProfilePayload, ProfileLink } from "@/app/api/me/profile/route";

export type ProfileFormProfile = ProfilePayload & {
  email?: string;
  onboardingCompletedAt?: string | null;
  instagramConnected?: boolean;
  accountType?: string;
};

const CREATOR_NICHES = [
  "Fashion", "Beauty", "Food", "Tech", "Health", "Travel",
  "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance",
  "Education", "Photography", "Music", "Sports", "Comedy",
  "DIY", "Art", "Pets", "Business",
];

const MAX_NICHES = 5;

/** Must stay under API limit (see app/api/me/avatar/route.ts) so Neon/pg updates don't time out. */
const MAX_AVATAR_DATA_URL_CHARS = 180_000;

async function resizeImageFileToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let maxSide = 320;
  let quality = 0.82;
  for (let i = 0; i < 12; i++) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_AVATAR_DATA_URL_CHARS) {
      bitmap.close();
      return url;
    }
    quality -= 0.07;
    if (quality < 0.52) {
      quality = 0.78;
      maxSide = Math.max(96, Math.round(maxSide * 0.72));
    }
  }
  bitmap.close();
  throw new Error("Could not compress image enough; try a smaller file.");
}

export function ProfileForm({
  profile,
  onSave,
  saving,
  submitLabel = "Save profile",
  onAvatarUrlChange,
  externalError,
  formId,
  hideSubmitButton,
  isBrand = false,
}: {
  profile: ProfileFormProfile;
  onSave: (data: ProfilePayload) => Promise<void>;
  saving: boolean;
  submitLabel?: string;
  onAvatarUrlChange?: (avatarUrl: string | null) => void;
  externalError?: string | null;
  /** id attribute on the <form> so an external button can submit it via form={formId} */
  formId?: string;
  /** Hide the internal submit button (use when the parent provides its own submit button) */
  hideSubmitButton?: boolean;
  /** Brand accounts don't need bio or social links */
  isBrand?: boolean;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [niches, setNiches] = useState<string[]>(profile.niches ?? []);
  const [links, setLinks] = useState<ProfileLink[]>(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setLinks(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  }, [profile]);

  // Debounced username availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/\s+/g, "-");
    // If same as saved username, skip the check — it's their own
    if (!clean || clean === (profile.username ?? "")) {
      setUsernameAvailable(null);
      setUsernameError(null);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    setUsernameAvailable(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/me/username-check?username=${encodeURIComponent(clean)}`, { credentials: "include" });
        const data = await res.json() as { available: boolean; error?: string };
        setUsernameAvailable(data.available);
        setUsernameError(data.available ? null : (data.error ?? "Not available"));
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, profile.username]);

  const notifyAvatar = (url: string | null) => {
    setAvatarUrl(url ?? "");
    onAvatarUrlChange?.(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setAvatarError("Choose an image file (JPEG, PNG, or WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("Image is too large (max 8MB before resize).");
      return;
    }
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageFileToJpegDataUrl(file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarDataUrl: dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(typeof json.error === "string" ? json.error : "Upload failed");
        return;
      }
      notifyAvatar(typeof json.avatarUrl === "string" ? json.avatarUrl : null);
    } catch {
      setAvatarError("Could not process image.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const useInstagramPhoto = async () => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/me/profile/use-instagram-photo", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(typeof json.error === "string" ? json.error : "Could not load Instagram photo");
        return;
      }
      notifyAvatar(typeof json.avatarUrl === "string" ? json.avatarUrl : null);
    } finally {
      setAvatarBusy(false);
    }
  };

  const clearPhoto = async () => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarDataUrl: null }),
      });
      if (res.ok) notifyAvatar(null);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanUsername) {
      setUsernameError("Username is required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanUsername)) {
      setUsernameError("Only letters, numbers, and hyphens allowed");
      return;
    }
    if (usernameChecking) return; // wait for check to finish
    if (usernameAvailable === false) return; // already showing the error
    const payload: ProfilePayload = {
      name: name.trim() || null,
      username: cleanUsername,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      links: links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
      niches,
    };
    onSave(payload);
  };

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const inputCls = "mt-1 w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition";

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="flex flex-col gap-6">

        {/* External error (non-username) */}
        {externalError && !externalError.toLowerCase().includes("username") && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {externalError}
          </div>
        )}

        {/* Avatar + name/username row */}
        <div className="flex items-stretch gap-4">
          {/* Avatar with pencil overlay */}
          <div className="shrink-0 w-32">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <div className="relative group h-32 w-32 rounded-full overflow-hidden border-2 border-border bg-muted shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={128} height={128} referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-display text-muted-foreground">
                  {(name || username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {/* Pencil overlay — scoped inside the circle */}
              <button
                type="button"
                disabled={avatarBusy || saving}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                aria-label="Upload photo"
              >
              {avatarBusy ? (
                <svg className="animate-spin" width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              )}
              </button>
            </div>
            {/* Secondary actions below avatar */}
            <div className="mt-1.5 flex justify-center gap-2 flex-wrap">
              {profile.instagramConnected && (
                <button type="button" disabled={avatarBusy || saving} onClick={useInstagramPhoto}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap">
                  IG photo
                </button>
              )}
              {avatarUrl && (
                <button type="button" disabled={avatarBusy || saving} onClick={clearPhoto}
                  className="text-[10px] text-muted-foreground hover:text-red-500 disabled:opacity-40 transition-colors">
                  Remove
                </button>
              )}
            </div>
            {avatarError && <p className="text-[10px] text-red-500 text-center mt-1">{avatarError}</p>}
          </div>

          {/* Display name + username stacked to fill height */}
          <div className="flex flex-col gap-3 flex-1 min-w-0 justify-center">
            <div>
              <label className="block text-sm font-medium text-foreground">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Username</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setUsernameError(null); }}
                  className={`w-full pl-7 pr-8 py-2.5 border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 transition ${
                    usernameError || externalError?.toLowerCase().includes("username")
                      ? "border-red-500 focus:ring-red-300"
                      : usernameAvailable === true
                        ? "border-green-500 focus:ring-green-300"
                        : "border-border focus:ring-ring/30"
                  }`}
                  placeholder="yourname"
                />
                {/* Status icon inside input */}
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  {usernameChecking ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                  ) : usernameAvailable === true ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : usernameError ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  ) : null}
                </span>
              </div>
              {usernameError ? (
                <p className="mt-1 text-xs text-red-500 font-medium">{usernameError}</p>
              ) : externalError?.toLowerCase().includes("username") ? (
                <p className="mt-1 text-xs text-red-500 font-medium">{externalError}</p>
              ) : username ? (
                <p className={`mt-1 text-xs ${usernameAvailable === true ? "text-green-600" : "text-muted-foreground"}`}>
                  kitevo.com/{username.trim().toLowerCase().replace(/\s+/g, "-")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Remaining fields */}
        <div className="space-y-4">

          {!isBrand && (
            <div>
              <label className="block text-sm font-medium text-foreground">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Short bio shown on your media kit"
              />
            </div>
          )}

          {!isBrand && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Content niches</label>
                <span className="text-xs text-muted-foreground">{niches.length}/{MAX_NICHES}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CREATOR_NICHES.map((n) => {
                  const selected = niches.includes(n);
                  const maxed = !selected && niches.length >= MAX_NICHES;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={maxed}
                      onClick={() =>
                        setNiches((prev) =>
                          selected ? prev.filter((x) => x !== n) : [...prev, n]
                        )
                      }
                      className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-all ${
                        selected
                          ? "bg-foreground text-background"
                          : maxed
                          ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {n}
                    </button>
                  );
                })}
              </div>
              {niches.length >= MAX_NICHES && (
                <p className="mt-1.5 text-xs text-muted-foreground">Maximum {MAX_NICHES} niches selected. Remove one to add another.</p>
              )}
            </div>
          )}

          {!isBrand && (
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">Links</label>
                <button type="button" onClick={addLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors">+ Add link</button>
              </div>
              <div className="mt-2 space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                      placeholder="Label"
                      className="w-28 shrink-0 px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
                    />
                    <input
                      type="url"
                      value={l.url}
                      onChange={(e) => updateLink(i, "url", e.target.value)}
                      placeholder="https://…"
                      className="flex-1 min-w-0 px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="shrink-0 p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
                      aria-label="Remove link"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hideSubmitButton && (
            <button
              type="submit"
              disabled={saving || avatarBusy}
              className="h-10 rounded-full bg-foreground text-background px-8 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : submitLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
