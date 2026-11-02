"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Modal } from "@/app/components/workspace/Modal";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { Badge } from "@/app/components/Badge";

type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: "point" | "verify" };
export type KitDomain = {
  hostname: string;
  status: "pending" | "active";
  verified: boolean;
  dnsConfigured: boolean;
  tlsReady: boolean;
  lastError: string | null;
  lastCheckedAt: string | null;
  records: DnsRecord[];
};
type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; allowed: boolean; configured: boolean; domain: KitDomain | null };

/** Re-check a pending domain this often while the dialog is open (DNS usually lands in minutes). */
const AUTO_CHECK_MS = 20_000;

/**
 * Connect a creator's own domain to a kit: enter it → add the DNS record shown → we check
 * (automatically while open, or on "Check now") until it's live over HTTPS.
 */
export function DomainDialog({
  kit,
  open,
  onClose,
  onChange,
}: {
  kit: { id: string; name: string };
  open: boolean;
  onClose: () => void;
  onChange?: (domain: KitDomain | null) => void;
}) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<null | "connect" | "check" | "remove">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setDomain = useCallback((domain: KitDomain | null) => {
    setState((s) => (s.phase === "ready" ? { ...s, domain } : s));
    onChangeRef.current?.(domain);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ phase: "loading" });
    setError(null);
    setConfirmRemove(false);
    fetch(`/api/kits/${kit.id}/domain`, { credentials: "include" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) return setState({ phase: "error", message: d.error ?? "Couldn't load the domain settings." });
        setState({ phase: "ready", allowed: !!d.allowed, configured: !!d.configured, domain: d.domain ?? null });
      })
      .catch(() => !cancelled && setState({ phase: "error", message: "Couldn't reach the server." }));
    return () => {
      cancelled = true;
    };
  }, [open, kit.id]);

  const check = useCallback(
    async (quiet = false) => {
      if (!quiet) setBusy("check");
      try {
        const r = await fetch(`/api/kits/${kit.id}/domain/check`, { method: "POST", credentials: "include" });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.domain) setDomain(d.domain);
        else if (!quiet) setError(d.error ?? "Couldn't check the domain.");
      } catch {
        if (!quiet) setError("Couldn't reach the server.");
      } finally {
        if (!quiet) setBusy(null);
      }
    },
    [kit.id, setDomain],
  );

  // Keep checking a pending domain quietly while the dialog is open.
  const pending = state.phase === "ready" && state.domain?.status === "pending";
  useEffect(() => {
    if (!open || !pending) return;
    const t = setInterval(() => check(true), AUTO_CHECK_MS);
    return () => clearInterval(t);
  }, [open, pending, check]);

  async function connect() {
    setBusy("connect");
    setError(null);
    try {
      const r = await fetch(`/api/kits/${kit.id}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hostname: input }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "Couldn't connect the domain.");
      setDomain(d.domain);
      setInput("");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    try {
      const r = await fetch(`/api/kits/${kit.id}/domain`, { method: "DELETE", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "Couldn't remove the domain.");
      setDomain(null);
      setConfirmRemove(false);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissible={busy === null} size="md" title="Custom domain" description={kit.name}>
      {state.phase === "loading" ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Loading…
        </div>
      ) : state.phase === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : !state.allowed ? (
        <div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Put your kit on your own domain, like <span className="font-mono text-foreground">kit.yourname.com</span>. Custom
            domains are included in Starter and Pro.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose}>Not now</Button>
            <ButtonLink variant="primary" href="/pricing?plan=starter">See plans</ButtonLink>
          </div>
        </div>
      ) : state.domain ? (
        <DomainStatus
          domain={state.domain}
          busy={busy}
          confirmRemove={confirmRemove}
          onCheck={() => check()}
          onAskRemove={() => setConfirmRemove(true)}
          onCancelRemove={() => setConfirmRemove(false)}
          onRemove={remove}
        />
      ) : !state.configured ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Custom domains aren&apos;t switched on yet. Your plan includes them, and they&apos;ll appear here as soon as they are.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) connect();
          }}
        >
          <label htmlFor="kit-domain" className="text-sm font-medium text-foreground">Your domain</label>
          <input
            id="kit-domain"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="kit.yourname.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            A subdomain like <span className="font-mono">kit.</span> or <span className="font-mono">media.</span> is easiest: one DNS
            record and your main website stays as it is. You&apos;ll need access to your domain&apos;s DNS settings.
          </p>
          {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose} disabled={busy !== null}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy !== null || !input.trim()}>
              {busy === "connect" ? "Connecting…" : "Connect domain"}
            </Button>
          </div>
        </form>
      )}
      {error && state.phase === "ready" && state.domain && (
        <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </Modal>
  );
}

function DomainStatus({
  domain,
  busy,
  confirmRemove,
  onCheck,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  domain: KitDomain;
  busy: null | "connect" | "check" | "remove";
  confirmRemove: boolean;
  onCheck: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  const live = domain.status === "active";
  const url = `https://${domain.hostname}`;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-all font-mono text-sm font-medium text-foreground">{domain.hostname}</p>
        {live ? <Badge variant="success" dot>Live</Badge> : <Badge variant="warning" dot>Waiting for DNS</Badge>}
      </div>

      {live ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={url} target="_blank" rel="noopener noreferrer" size="sm">
            <ExternalLink size={14} aria-hidden /> Open
          </ButtonLink>
          <CopyButton value={url} label="Copy link" />
        </div>
      ) : (
        <>
          <ol className="mt-4 space-y-1.5 text-sm">
            <Step done label="Domain added" />
            <Step done={domain.verified && domain.dnsConfigured} label="DNS points to Kitevo" />
            <Step done={domain.tlsReady} label="Secure connection (HTTPS) ready" />
          </ol>

          <p className="mt-5 text-sm font-medium text-foreground">Add {domain.records.length === 1 ? "this record" : "these records"} at your DNS provider</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground sm:grid-cols-[3.5rem_minmax(0,8rem)_minmax(0,1fr)]">
              <span>Type</span>
              <span className="hidden sm:block">Name</span>
              <span className="hidden sm:block">Value</span>
              <span className="sm:hidden">Name · Value</span>
            </div>
            {domain.records.map((r) => (
              <div key={`${r.type}-${r.name}-${r.value}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 last:border-0 sm:grid-cols-[3.5rem_minmax(0,8rem)_minmax(0,1fr)]">
                <span className="font-mono text-xs font-semibold text-foreground">{r.type}</span>
                <CopyValue value={r.name} />
                <CopyValue value={r.value} className="col-start-2 sm:col-start-auto" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            In your domain provider (GoDaddy, Namecheap, Cloudflare…), open DNS settings and add{" "}
            {domain.records.length === 1 ? "a record" : "each record"} with exactly this type, name and value. On Cloudflare, set it to
            &ldquo;DNS only&rdquo; (grey cloud).
            {domain.records.some((r) => r.purpose === "verify") &&
              " The TXT record proves the domain is yours, because it's already connected to another site on our host."}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Changes usually show up within an hour, occasionally up to 48. We keep checking while this window is open.
          </p>
          {domain.lastError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{domain.lastError}</p>}
          <div className="mt-4">
            <Button size="sm" onClick={onCheck} disabled={busy !== null}>
              <RefreshCw size={14} className={busy === "check" ? "animate-spin" : ""} aria-hidden />
              {busy === "check" ? "Checking…" : "Check now"}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-border pt-4">
        {confirmRemove ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Visitors to {domain.hostname} will stop seeing your kit. Your Kitevo link keeps working.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onCancelRemove} disabled={busy !== null}>Keep</Button>
              <Button size="sm" variant="danger" onClick={onRemove} disabled={busy !== null}>
                {busy === "remove" ? "Removing…" : "Remove domain"}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onAskRemove} className="text-xs font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400">
            Remove domain
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "border border-border"}`}
        aria-hidden
      >
        {done && <Check size={10} strokeWidth={3} />}
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="sr-only">{done ? "(done)" : "(waiting)"}</span>
    </li>
  );
}

function CopyValue({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copy"
      className={`group flex min-w-0 items-start gap-1.5 rounded text-left font-mono text-xs text-foreground hover:text-primary ${className}`}
    >
      <span className="min-w-0 break-all">{value}</span>
      {copied ? <Check size={12} className="mt-0.5 shrink-0 text-primary" aria-label="Copied" /> : <Copy size={12} className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />}
    </button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : label}
    </Button>
  );
}
