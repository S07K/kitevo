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

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6 max-w-md">
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Profile photo</label>
        <p className="mt-0.5 text-xs text-[#5C5C5C]">
          Shown on your public kit. Upload a photo or pull from Instagram when connected.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden border border-[#E8E6E3] bg-[#F5F5F5]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={80} height={80} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-display text-[#A3A3A3]">
                {(name || username || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              disabled={avatarBusy || saving}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-sm font-medium border border-[#1A1A1A] text-[#1A1A1A] rounded-sm hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              {avatarBusy ? "Working…" : "Upload photo"}
            </button>
            {profile.instagramConnected ? (
              <button
                type="button"
                disabled={avatarBusy || saving}
                onClick={useInstagramPhoto}
                className="px-3 py-2 text-sm font-medium border border-[#E8E6E3] text-[#1A1A1A] rounded-sm hover:bg-[#FAFAFA] disabled:opacity-50"
              >
                Use Instagram
              </button>
            ) : null}
            {avatarUrl ? (
              <button
                type="button"
                disabled={avatarBusy || saving}
                onClick={clearPhoto}
                className="px-3 py-2 text-sm text-[#737373] hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
        {avatarError && <p className="mt-2 text-sm text-red-600">{avatarError}</p>}
        <button
          type="button"
          onClick={() => setShowAdvancedAvatarUrl((v) => !v)}
          className="mt-3 text-xs text-[#737373] hover:underline"
        >
          {showAdvancedAvatarUrl ? "Hide" : "Advanced"}: paste image URL
        </button>
        {showAdvancedAvatarUrl && (
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A] text-sm"
            placeholder="https://…"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Display name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Username (for /kit/username link)</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="username"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="Short bio"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[#1A1A1A]">Links</label>
          <button type="button" onClick={addLink} className="text-sm text-[#5C5C5C] hover:underline">+ Add</button>
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
                  className="w-full min-w-0 sm:flex-1 px-3 py-2 border border-[#D4D4D4] rounded-sm text-sm text-[#1A1A1A]"
                />
                <input
                  type="url"
                  value={l.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="URL"
                  className="w-full min-w-0 sm:flex-1 px-3 py-2 border border-[#D4D4D4] rounded-sm text-sm text-[#1A1A1A]"
                />
              </div>
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="shrink-0 self-end sm:self-center inline-flex items-center gap-1.5 px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-sm border border-red-200 hover:border-red-300 transition-colors"
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
        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
