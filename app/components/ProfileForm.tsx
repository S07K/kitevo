"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Camera, Check, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { SiInstagram } from "@icons-pack/react-simple-icons";
import type { ProfilePayload, ProfileLink } from "@/app/api/me/profile/route";
import { APP_HOST } from "@/lib/app-url";
import { CREATOR_NICHES, MAX_NICHES } from "@/lib/niches";
import { Button } from "@/app/components/workspace/Button";

export type ProfileFormProfile = ProfilePayload & {
  email?: string;
  onboardingCompletedAt?: string | null;
  instagramConnected?: boolean;
  accountType?: string;
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

const cleanUsernameOf = (u: string) => u.trim().toLowerCase().replace(/\s+/g, "-");
const cleanLinks = (links: ProfileLink[]) =>
  links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() }));

const fieldCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/40";

/** One block of the form: heading + helper on top, fields below. */
function FormSection({ title, hint, action, children }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-6 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
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
  saved = false,
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
  /** Parent sets this briefly after a successful save; shown next to the save button. */
  saved?: boolean;
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
    setNiches(profile.niches ?? []);
    setLinks(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  }, [profile]);

  // Debounced username availability check
  useEffect(() => {
    const clean = cleanUsernameOf(username);
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
        const data = (await res.json()) as { available: boolean; error?: string };
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

  // Photo changes save immediately; only the text fields below need "Save".
  const dirty = useMemo(() => {
    const snap = (v: { name: string; username: string; bio: string; niches: string[]; links: ProfileLink[] }) =>
      JSON.stringify({ ...v, name: v.name.trim(), username: cleanUsernameOf(v.username), bio: v.bio.trim(), links: cleanLinks(v.links) });
    return (
      snap({ name, username, bio, niches, links }) !==
      snap({ name: profile.name ?? "", username: profile.username ?? "", bio: profile.bio ?? "", niches: profile.niches ?? [], links: profile.links ?? [] })
    );
  }, [name, username, bio, niches, links, profile]);

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
    const cleanUsername = cleanUsernameOf(username);
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
      links: cleanLinks(links),
      niches,
    };
    onSave(payload);
  };

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const usernameExternalError = externalError?.toLowerCase().includes("username") ? externalError : null;
  const usernameProblem = usernameError ?? usernameExternalError;
  const initial = (name || username || "?").charAt(0).toUpperCase();

  return (
    <form id={formId} onSubmit={handleSubmit}>
      {externalError && !usernameExternalError && (
        <div role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {externalError}
        </div>
      )}

      <div className="divide-y divide-border">
        {/* ── Photo ── */}
        <section className="px-5 py-6 sm:px-6">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, nothing for next/image to optimise
                  <img src={avatarUrl} alt="Your profile photo" className="h-full w-full object-cover" width={96} height={96} referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl text-muted-foreground">{initial}</div>
                )}
                {avatarBusy && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                    <Loader2 size={20} className="animate-spin text-white" aria-label="Updating photo" />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={avatarBusy || saving}
                onClick={() => fileInputRef.current?.click()}
                aria-label={avatarUrl ? "Change photo" : "Upload photo"}
                className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <Camera size={14} aria-hidden />
              </button>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Profile photo</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Shown on your kit, your public profile and in messages. JPG, PNG or WebP. Saves as soon as you pick one.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={avatarBusy || saving} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} aria-hidden /> {avatarUrl ? "Change photo" : "Upload photo"}
                </Button>
                {profile.instagramConnected && (
                  <Button size="sm" variant="ghost" disabled={avatarBusy || saving} onClick={useInstagramPhoto}>
                    <SiInstagram size={12} aria-hidden /> Use Instagram photo
                  </Button>
                )}
                {avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={avatarBusy || saving}
                    onClick={clearPhoto}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={13} aria-hidden /> Remove
                  </Button>
                )}
              </div>
              {avatarError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
            </div>
          </div>
        </section>

        {/* ── Identity ── */}
        <FormSection title="Name & URL" hint="Your username is your public address. Changing it breaks links you've already shared.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Display name
              </label>
              <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} placeholder="Your name" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="pf-username" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Username
              </label>
              <div
                className={`flex items-center rounded-xl border bg-background transition focus-within:ring-2 ${
                  usernameProblem
                    ? "border-red-500 focus-within:ring-red-300/50"
                    : usernameAvailable === true
                      ? "border-green-500 focus-within:ring-green-300/50"
                      : "border-border focus-within:ring-ring/40"
                }`}
              >
                <span className="shrink-0 pl-3.5 text-sm text-muted-foreground">{APP_HOST}/</span>
                <input
                  id="pf-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  aria-invalid={!!usernameProblem}
                  aria-describedby="pf-username-status"
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="yourname"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="flex w-8 shrink-0 items-center justify-center" aria-hidden>
                  {usernameChecking ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  ) : usernameAvailable === true ? (
                    <Check size={14} strokeWidth={2.5} className="text-green-600 dark:text-green-400" />
                  ) : usernameProblem ? (
                    <X size={14} strokeWidth={2.5} className="text-red-600 dark:text-red-400" />
                  ) : null}
                </span>
              </div>
              <p id="pf-username-status" aria-live="polite" className="mt-1.5 text-xs">
                {usernameProblem ? (
                  <span className="font-medium text-red-600 dark:text-red-400">{usernameProblem}</span>
                ) : usernameChecking ? (
                  <span className="text-muted-foreground">Checking availability…</span>
                ) : usernameAvailable === true ? (
                  <span className="text-green-600 dark:text-green-400">Available</span>
                ) : null}
              </p>
            </div>
          </div>
        </FormSection>

        {!isBrand && (
          <FormSection title="About you" hint="Your bio sits at the top of your media kit and public profile.">
            <label htmlFor="pf-bio" className="sr-only">
              Bio
            </label>
            <textarea
              id="pf-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={`${fieldCls} resize-y`}
              placeholder="One or two lines about what you make and who it's for"
            />
            <p className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">{bio.trim().length} characters</p>
          </FormSection>
        )}

        {!isBrand && (
          <FormSection
            title="Content niches"
            hint={`Brands filter Discover by niche, and campaigns are matched to them. Pick up to ${MAX_NICHES}.`}
            action={
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {niches.length}/{MAX_NICHES}
              </span>
            }
          >
            <div className="flex flex-wrap gap-2" role="group" aria-label="Content niches">
              {CREATOR_NICHES.map((n) => {
                const selected = niches.includes(n);
                const maxed = !selected && niches.length >= MAX_NICHES;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={maxed}
                    aria-pressed={selected}
                    onClick={() => setNiches((prev) => (selected ? prev.filter((x) => x !== n) : [...prev, n]))}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : maxed
                          ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50"
                          : "border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {selected && <Check size={12} strokeWidth={3} aria-hidden />}
                    {n}
                  </button>
                );
              })}
            </div>
            {niches.length >= MAX_NICHES && (
              <p className="mt-2 text-xs text-muted-foreground">That&apos;s the maximum. Remove one to pick another.</p>
            )}
          </FormSection>
        )}

        {!isBrand && (
          <FormSection
            title="Links"
            hint="Website, shop, newsletter: anything brands should see on your public profile."
            action={
              <Button size="sm" variant="ghost" onClick={addLink}>
                <Plus size={14} aria-hidden /> Add link
              </Button>
            }
          >
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : (
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                      placeholder="Label"
                      aria-label={`Link ${i + 1} label`}
                      className={`${fieldCls} w-32 shrink-0 sm:w-40`}
                    />
                    <input
                      type="url"
                      value={l.url}
                      onChange={(e) => updateLink(i, "url", e.target.value)}
                      placeholder="https://…"
                      aria-label={`Link ${i + 1} URL`}
                      className={`${fieldCls} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      aria-label={`Remove link ${i + 1}`}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        )}
      </div>

      {!hideSubmitButton && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saved && !dirty ? (
              <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                <Check size={13} aria-hidden /> Saved
              </span>
            ) : dirty ? (
              "You have unsaved changes"
            ) : (
              "All changes saved"
            )}
          </p>
          <Button type="submit" variant="primary" disabled={saving || avatarBusy || !dirty}>
            {saving ? "Saving…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
