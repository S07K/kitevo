"use client";

import { useState, useEffect, useRef } from "react";
import type { ProfilePayload, ProfileLink } from "@/app/api/me/profile/route";

export type ProfileFormProfile = ProfilePayload & {
  email?: string;
  onboardingCompletedAt?: string | null;
  instagramConnected?: boolean;
};

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
}: {
  profile: ProfileFormProfile;
  onSave: (data: ProfilePayload) => Promise<void>;
  saving: boolean;
  submitLabel?: string;
  /** Called after upload or Instagram sync so parent can refresh local profile state. */
  onAvatarUrlChange?: (avatarUrl: string | null) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [links, setLinks] = useState<ProfileLink[]>(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  const [showAdvancedAvatarUrl, setShowAdvancedAvatarUrl] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setLinks(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  }, [profile]);

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
    const payload: ProfilePayload = {
      name: name.trim() || null,
      username: username.trim().toLowerCase().replace(/\s+/g, "-") || null,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      links: links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    onSave(payload);
  };

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const inputCls = "mt-1 w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition";

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6 max-w-md">
      <div>
        <label className="block text-sm font-semibold text-foreground">Profile photo</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Shown on your public kit. Upload a photo or pull from Instagram when connected.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          {/* Avatar on top */}
          <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden border border-border bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={80} height={80} referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-display text-muted-foreground">
                {(name || username || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Half-half buttons */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          <div className="flex w-full gap-2">
            <button
              type="button"
              disabled={avatarBusy || saving}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-foreground bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-opacity whitespace-nowrap"
            >
              {avatarBusy ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  Upload photo
                </>
              )}
            </button>
            {profile.instagramConnected && (
              <button
                type="button"
                disabled={avatarBusy || saving}
                onClick={useInstagramPhoto}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border text-foreground hover:border-foreground/40 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect width="20" height="20" x="2" y="2" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                Use Instagram
              </button>
            )}
          </div>

          {/* Remove at bottom */}
          {avatarUrl && (
            <button
              type="button"
              disabled={avatarBusy || saving}
              onClick={clearPhoto}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
              Remove photo
            </button>
          )}
          {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
        </div>

        {/* Advanced URL toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedAvatarUrl((v) => !v)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvancedAvatarUrl ? "Hide" : "Advanced"}: paste image URL
        </button>
        {showAdvancedAvatarUrl && (
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
            placeholder="https://…"
          />
        )}
      </div>

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
        <label className="block text-sm font-medium text-foreground">Username (for /kit/username link)</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputCls}
          placeholder="username"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="Short bio"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">Links</label>
          <button type="button" onClick={addLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors">+ Add</button>
        </div>
        <div className="mt-2 space-y-3">
          {links.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-1 sm:gap-2 min-w-0">
                <input
                  type="text"
                  value={l.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Label"
                  className={`${inputCls} sm:flex-1`}
                />
                <input
                  type="url"
                  value={l.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="URL"
                  className={`${inputCls} sm:flex-1`}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="shrink-0 self-end sm:self-center inline-flex items-center gap-1.5 px-2.5 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-colors"
                aria-label="Remove link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={saving || avatarBusy}
        className="w-full h-10 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
