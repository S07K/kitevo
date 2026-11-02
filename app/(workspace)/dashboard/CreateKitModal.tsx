"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_HOST } from "@/lib/app-url";
import { Modal } from "@/app/components/workspace/Modal";
import { Button } from "@/app/components/workspace/Button";

/** Same rule as "Change URL" (KitActions): lowercase, dashes for spaces, a-z 0-9 - only. */
function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const fieldCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/40";

/**
 * The one place a kit is created. Name → URL (auto-filled from the name until the creator
 * edits it), then straight into the editor. Opened from every "new kit" entry point on the
 * dashboard; nothing is created inline on the page.
 */
export function CreateKitModal({
  open,
  onClose,
  isFirst,
  allowedKits,
}: {
  open: boolean;
  onClose: () => void;
  /** First kit: friendlier copy. */
  isFirst: boolean;
  allowedKits: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<{ field: "name" | "slug" | "form"; message: string } | null>(null);
  const [creating, setCreating] = useState(false);

  // Fresh form each time it opens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setSlug("");
    setSlugEdited(false);
    setError(null);
    setCreating(false);
  }, [open]);

  const onName = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
    if (error?.field !== "slug") setError(null);
  };

  const onSlug = (v: string) => {
    setSlugEdited(true);
    setSlug(toSlug(v));
    setError(null);
  };

  async function submit() {
    const cleanName = name.trim();
    const cleanSlug = toSlug(slug);
    if (!cleanName) return setError({ field: "name", message: "Give your kit a name." });
    if (cleanSlug.length < 2) return setError({ field: "slug", message: "Pick a URL of at least 2 letters or numbers." });

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleanSlug, name: cleanName }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        // Keep the spinner up: the editor route takes over from here.
        router.push(`/kit/edit?id=${encodeURIComponent(data.id)}`);
        return;
      }
      setCreating(false);
      if (res.status === 409) setError({ field: "slug", message: "That URL is taken. Try another." });
      else setError({ field: "form", message: data.error ?? "Couldn't create the kit. Try again." });
    } catch {
      setCreating(false);
      setError({ field: "form", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!creating}
      size="md"
      title={isFirst ? "Create your media kit" : "New kit"}
      description={
        isFirst
          ? "Name it and pick its link. You'll add your stats, rates and style in the editor next."
          : `Your plan includes ${allowedKits} kits. Make one per niche, language or audience.`
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!creating) submit();
        }}
        noValidate
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="ck-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Kit name
            </label>
            <input
              id="ck-name"
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="e.g. Fashion & Lifestyle"
              maxLength={80}
              aria-invalid={error?.field === "name"}
              aria-describedby={error?.field === "name" ? "ck-name-error" : undefined}
              className={fieldCls}
            />
            {error?.field === "name" && (
              <p id="ck-name-error" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                {error.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="ck-slug" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Link
            </label>
            <div
              className={`flex items-center rounded-xl border bg-background transition focus-within:ring-2 ${
                error?.field === "slug" ? "border-red-500 focus-within:ring-red-300/50" : "border-border focus-within:ring-ring/40"
              }`}
            >
              <span className="shrink-0 pl-3.5 text-sm text-muted-foreground">{APP_HOST}/kit/</span>
              <input
                id="ck-slug"
                value={slug}
                onChange={(e) => onSlug(e.target.value)}
                placeholder="fashion-lifestyle"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={error?.field === "slug"}
                aria-describedby="ck-slug-hint"
                className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <p id="ck-slug-hint" aria-live="polite" className="mt-1.5 text-xs">
              {error?.field === "slug" ? (
                <span className="font-medium text-red-600 dark:text-red-400">{error.message}</span>
              ) : (
                <span className="text-muted-foreground">Letters, numbers and dashes. You can change it later.</span>
              )}
            </p>
          </div>

          {error?.field === "form" && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error.message}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={creating}>
            {creating ? "Creating…" : "Create & open editor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
