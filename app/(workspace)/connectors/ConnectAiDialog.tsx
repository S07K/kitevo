"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { AI_PROVIDER_INFO, type AiProvider } from "@/lib/ai/providers";

export type AiConnection = { provider: AiProvider; keyHint: string; model: string | null; defaultModel: string; connectedAt: string };

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/**
 * Connect (or update) the creator's own AI key for Copilot. The key is checked with the
 * provider before it's saved, stored encrypted, and never shown again (only its hint).
 */
export function ConnectAiDialog({
  provider,
  current,
  onClose,
  onConnected,
}: {
  provider: AiProvider | null;
  current: AiConnection | null;
  onClose: () => void;
  onConnected: (c: AiConnection) => void;
}) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const info = provider ? AI_PROVIDER_INFO[provider] : null;
  const same = !!provider && current?.provider === provider;
  const replacing = !!provider && !!current && current.provider !== provider;

  useEffect(() => {
    if (!provider) return;
    setKey("");
    setModel(current?.provider === provider ? (current.model ?? "") : "");
    setError(null);
  }, [provider, current]);

  async function save() {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, key: key.trim() || undefined, model: model.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError({ field: data.field, message: data.error ?? "Couldn't connect. Try again." });
      onConnected(data);
    } catch {
      setError({ message: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!provider}
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title={same ? `${info?.name} for Copilot` : `Connect ${info?.name ?? ""}`}
      description="Copilot will write with your own AI account: no monthly limit, on any plan. Usage is billed by your provider (many have a free tier)."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="connect-ai" variant="primary" disabled={busy || (!same && !key.trim())}>
            {busy ? "Checking key…" : same ? "Save" : "Connect"}
          </Button>
        </div>
      }
    >
      {info && (
        <form
          id="connect-ai"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            {info.hint}{" "}
            <a href={info.keysUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Get a {info.name} API key <ExternalLink size={11} aria-hidden />
            </a>
          </p>
          {replacing && (
            <p className="text-xs text-amber-700 dark:text-amber-400">This replaces your {AI_PROVIDER_INFO[current!.provider].name} key. Copilot uses one AI account at a time.</p>
          )}
          <div>
            <label htmlFor="ai-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">API key</label>
            <input
              id="ai-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={same ? `Leave blank to keep ${current!.keyHint}` : "Paste your API key"}
              autoComplete="off"
              spellCheck={false}
              className={`${field} font-mono`}
            />
            {error?.field === "key" && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Stored encrypted. Kitevo only uses it for drafts you ask for.</p>
          </div>
          <div>
            <label htmlFor="ai-model" className="mb-1.5 block text-xs font-medium text-muted-foreground">Model (optional)</label>
            <input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={info.defaultModel} autoComplete="off" spellCheck={false} className={`${field} font-mono`} />
            {error?.field === "model" ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Leave blank for {info.defaultModel}, or paste any model id your account can use.</p>
            )}
          </div>
          {error && !error.field && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
        </form>
      )}
    </Modal>
  );
}
