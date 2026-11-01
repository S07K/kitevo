"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText, Link2, Loader2, Lock, MoreHorizontal, Share, Trash2 } from "lucide-react";
import { APP_HOST } from "@/lib/app-url";
import { Modal } from "@/app/components/workspace/Modal";
import { Button, IconButton } from "@/app/components/workspace/Button";

/** Colours of each kit vibe: the dashboard shows a kit in its real palette. */
export const VIBE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  editorial: { bg: "#111110", fg: "#f5f0e8", label: "Editorial" },
  studio:    { bg: "#e8e6e1", fg: "#2d2d2b", label: "Studio" },
  noir:      { bg: "#1a1a18", fg: "#c9a84c", label: "Noir" },
  bloom:     { bg: "#f5ede4", fg: "#c97b4b", label: "Bloom" },
  electric:  { bg: "#0d0d1a", fg: "#6366f1", label: "Electric" },
  // Legacy presets
  warm:      { bg: "#F5F3F0", fg: "#1A1A1A", label: "Warm" },
  cool:      { bg: "#F0F3F7", fg: "#1E3A5F", label: "Cool" },
  paper:     { bg: "#FAFAF8", fg: "#111111", label: "Paper" },
  sage:      { bg: "#EEF3EA", fg: "#2F5D50", label: "Sage" },
  mist:      { bg: "#EDF2F8", fg: "#2B4C7E", label: "Mist" },
  blush:     { bg: "#F8EEEB", fg: "#A3485A", label: "Blush" },
  lavender:  { bg: "#F1EFF9", fg: "#5B4B9A", label: "Lavender" },
};

export function vibeFor(kit: { appearance?: unknown }) {
  const preset = (kit.appearance as { preset?: string } | undefined)?.preset ?? "warm";
  return VIBE_COLORS[preset] ?? VIBE_COLORS.warm;
}

export type ManagedKit = { id: string; slug: string; name: string; hasPassword?: boolean };

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none";

/**
 * Everything you do to a kit besides editing it: share & download, change URL, password,
 * delete. One "…" menu so the kit's own surface carries only Edit / View / Copy link.
 */
export function KitActionsMenu({
  kit,
  onDelete,
  onSlugChange,
  onPasswordChange,
}: {
  kit: ManagedKit;
  onDelete: () => void;
  onSlugChange: (id: string, newSlug: string) => void;
  onPasswordChange: (id: string, hasPassword: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"share" | "slug" | "password" | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hasPassword = kit.hasPassword ?? false;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={wrap} className="relative">
      <IconButton label={`More actions for ${kit.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} aria-hidden />
      </IconButton>
      {open && (
        <div role="menu" aria-label={`${kit.name} actions`} className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-border bg-background p-1 shadow-lg">
          <button role="menuitem" type="button" className={ITEM} onClick={pick(() => setDialog("share"))}>
            <Share size={15} className="text-muted-foreground" aria-hidden /> Share &amp; download
          </button>
          <button role="menuitem" type="button" className={ITEM} onClick={pick(() => setDialog("slug"))}>
            <Link2 size={15} className="text-muted-foreground" aria-hidden /> Change URL
          </button>
          <button role="menuitem" type="button" className={ITEM} onClick={pick(() => setDialog("password"))}>
            <Lock size={15} className={hasPassword ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"} aria-hidden />
            {hasPassword ? "Manage password" : "Password protect"}
          </button>
          <div className="my-1 h-px bg-border" />
          <button role="menuitem" type="button" className={`${ITEM} text-red-600 hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:focus:bg-red-950/30`} onClick={pick(onDelete)}>
            <Trash2 size={15} aria-hidden /> Delete kit
          </button>
        </div>
      )}

      <ShareDialog kit={kit} open={dialog === "share"} onClose={() => setDialog(null)} />
      <SlugDialog kit={kit} open={dialog === "slug"} onClose={() => setDialog(null)} onSaved={onSlugChange} />
      <PasswordDialog kit={kit} open={dialog === "password"} onClose={() => setDialog(null)} onSaved={onPasswordChange} />
    </div>
  );
}

/* ─── Dialogs ────────────────────────────────────────────────────────────── */

function ShareDialog({ kit, open, onClose }: { kit: ManagedKit; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/kit/${kit.slug}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  // PDF export is temporarily hidden (layout needs polish); the /export route and this
  // helper stay intact so restoring it is one more button.
  async function download(format: "pdf" | "pptx") {
    setExporting(true);
    try {
      const res = await fetch(format === "pptx" ? `/api/kits/${kit.id}/export-pptx` : `/api/kits/${kit.id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kit.slug}-media-kit.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share kit" description={kit.name}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Public link</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground">
              {APP_HOST}/kit/{kit.slug}
            </code>
            <Button variant="primary" size="sm" onClick={copy}>
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Download</p>
          <button
            type="button"
            onClick={() => download("pptx")}
            disabled={exporting}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <FileText size={15} className="text-orange-500" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">PowerPoint (.pptx)</span>
              <span className="block text-xs text-muted-foreground">Opens in Google Slides or PowerPoint</span>
            </span>
            {exporting ? (
              <Loader2 size={14} className="shrink-0 animate-spin" aria-label="Preparing download" />
            ) : (
              <Download size={14} className="shrink-0 text-muted-foreground" aria-hidden />
            )}
          </button>
        </div>

        <a
          href={`/kit/${kit.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ExternalLink size={13} aria-hidden /> View live kit
        </a>
      </div>
    </Modal>
  );
}

function SlugDialog({
  kit,
  open,
  onClose,
  onSaved,
}: {
  kit: ManagedKit;
  open: boolean;
  onClose: () => void;
  onSaved: (id: string, slug: string) => void;
}) {
  const [draft, setDraft] = useState(kit.slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(kit.slug);
      setError(null);
    }
  }, [open, kit.slug]);

  async function save() {
    const clean = draft.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean || clean === kit.slug) return onClose();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kits/${kit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Could not update URL");
      onSaved(kit.id, data.slug ?? clean);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissible={!saving} title="Change URL" description="Links you've already shared with the old URL will stop working.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="flex items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="shrink-0 pl-4 font-mono text-xs text-muted-foreground">{APP_HOST}/kit/</span>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            aria-label="Kit URL"
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-4 font-mono text-xs text-foreground focus:outline-none"
          />
        </label>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save URL"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordDialog({
  kit,
  open,
  onClose,
  onSaved,
}: {
  kit: ManagedKit;
  open: boolean;
  onClose: () => void;
  onSaved: (id: string, hasPassword: boolean) => void;
}) {
  const hasPassword = kit.hasPassword ?? false;
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft("");
      setError(null);
    }
  }, [open]);

  async function save(remove = false) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/kits/${kit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: remove ? "" : draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Failed");
      onSaved(kit.id, !remove && !!draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={hasPassword ? "Password protection" : "Set a password"}
      description={hasPassword ? "Your kit is private. Set a new password or remove protection." : "Only people with the password can view this kit."}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft) save();
        }}
      >
        <input
          type="password"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          aria-label={hasPassword ? "New password" : "Password"}
          placeholder={hasPassword ? "New password" : "Enter a password"}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {hasPassword && (
            <Button variant="danger-outline" onClick={() => save(true)} disabled={saving}>
              Remove password
            </Button>
          )}
          <span className="ml-auto flex gap-2">
            <Button onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !draft}>
              {saving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
            </Button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
