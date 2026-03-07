"use client";

import { useState, useEffect } from "react";
import type { ProfilePayload, ProfileLink } from "@/app/api/me/profile/route";

export type ProfileFormProfile = ProfilePayload & { email?: string; onboardingCompletedAt?: string | null };

export function ProfileForm({
  profile,
  onSave,
  saving,
  submitLabel = "Save profile",
}: {
  profile: ProfileFormProfile;
  onSave: (data: ProfilePayload) => Promise<void>;
  saving: boolean;
  submitLabel?: string;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [links, setLinks] = useState<ProfileLink[]>(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);

  useEffect(() => {
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setLinks(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  }, [profile]);

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

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

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-md">
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
        <label className="block text-sm font-medium text-[#1A1A1A]">Avatar URL</label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="https://..."
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
        disabled={saving}
        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
