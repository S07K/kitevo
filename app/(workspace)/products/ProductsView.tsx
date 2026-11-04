"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, Copy, Download, ExternalLink, ImagePlus, Pencil, Plus, Trash2, Users } from "lucide-react";
import { WorkspaceShell, PageHeader, Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink, IconButton } from "@/app/components/workspace/Button";
import Link from "next/link";
import { Modal } from "@/app/components/workspace/Modal";
import { Badge } from "@/app/components/Badge";
import { BrandChip } from "@/app/components/BrandChip";
import type { Connection } from "../connectors/ConnectRazorpayDialog";
import { ListCardSkeleton } from "@/app/components/Skeleton";
import { APP_URL } from "@/lib/app-url";
import { MAX_DESCRIPTION, MAX_NOTE, MAX_PRODUCTS, MAX_TITLE, PRODUCT_CURRENCIES, formatPrice } from "@/lib/commerce-shared";
import { resizeImageFileToJpegDataUrl } from "@/lib/resize-image";
import { BookingSource, schedulerName } from "./BookingSource";
import type { SchedulerConnection } from "../connectors/ConnectSchedulerDialog";

type Product = {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  deliveryUrl: string | null;
  deliveryNote: string;
  status: "draft" | "published";
  orders: number;
  priceCents: number;
  currency: string;
  type: "download" | "booking";
  bookingUrl: string | null;
};
/** Editor state: price is typed in major units ("499"), saved as minor units by the API. */
type Draft = Omit<Product, "id" | "orders" | "priceCents"> & { price: string };
type Lead = { id: string; buyerEmail: string; buyerName: string | null; createdAt: string };

const EMPTY: Draft = { title: "", description: "", coverUrl: null, deliveryUrl: "", deliveryNote: "", status: "draft", price: "", currency: "INR", type: "download", bookingUrl: null };

const base = APP_URL.replace(/\/$/, "");
const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

export function ProductsView() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [leadsFor, setLeadsFor] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // undefined = loading; [] = none connected
  const [connections, setConnections] = useState<Connection[] | undefined>(undefined);
  const [schedulers, setSchedulers] = useState<SchedulerConnection[]>([]);
  useEffect(() => {
    fetch("/api/scheduling/connections", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSchedulers)
      .catch(() => setSchedulers([]));
  }, []);
  useEffect(() => {
    fetch("/api/payments/connections", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Connection[]) => setConnections(rows.filter((c) => c.provider === "razorpay" || c.provider === "stripe")))
      .catch(() => setConnections([]));
  }, []);

  useEffect(() => {
    fetch("/api/products", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Product[]) => setProducts(rows))
      .catch(() => setError("Couldn't load your products. Refresh to try again."));
  }, []);

  const copy = (p: Product) => {
    navigator.clipboard?.writeText(`${base}/p/${p.id}`).then(() => {
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  async function remove(p: Product) {
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setProducts((ps) => (ps ?? []).filter((x) => x.id !== p.id));
    setDeleting(null);
  }

  const full = (products?.length ?? 0) >= MAX_PRODUCTS;

  return (
    <WorkspaceShell variant="creator" width="wide">
      <PageHeader
        eyebrow="Sell"
        title="Products"
        description="Sell digital products from your kit: free in exchange for an email, or for a price paid straight to you."
        actions={
          <Button variant="primary" onClick={() => setEditing({ id: null, draft: EMPTY })} disabled={!products || full}>
            <Plus size={15} aria-hidden /> New product
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          {error ? (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p>
          ) : !products ? (
            <>
              <ListCardSkeleton />
              <ListCardSkeleton />
            </>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <p className="font-display text-lg font-semibold text-foreground">Your first freebie</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                A preset, a guide, a template: something your audience would swap an email for. It shows on your kit, and you see everyone who downloads it.
              </p>
              <Button variant="primary" className="mt-5" onClick={() => setEditing({ id: null, draft: EMPTY })}>
                <Plus size={15} aria-hidden /> Create a product
              </Button>
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- base64 cover
                    <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : p.type === "booking" ? (
                    <CalendarClock size={18} className="text-muted-foreground" aria-hidden />
                  ) : (
                    <Download size={18} className="text-muted-foreground" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{p.title || "Untitled"}</p>
                    {p.status === "published" ? <Badge variant="success" dot>Live</Badge> : <Badge>Draft</Badge>}
                    {p.type !== "booking" && <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatPrice(p.priceCents, p.currency)}</span>}
                  </div>
                  {p.type === "booking" ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock size={12} aria-hidden /> Booked calls · bookings and payments are in {schedulerName(p.bookingUrl)}
                    </p>
                  ) : (
                    <button type="button" onClick={() => setLeadsFor(p)} className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Users size={12} aria-hidden /> {p.orders} {p.priceCents ? `sale${p.orders === 1 ? "" : "s"}` : `download${p.orders === 1 ? "" : "s"}`}
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton label={copied === p.id ? "Copied" : "Copy link"} onClick={() => copy(p)}>
                    {copied === p.id ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                  </IconButton>
                  <IconButton label="Preview" onClick={() => window.open(`/p/${p.id}`, "_blank", "noopener")}>
                    <ExternalLink size={15} aria-hidden />
                  </IconButton>
                  <IconButton
                    label="Edit"
                    onClick={() =>
                      setEditing({
                        id: p.id,
                        draft: {
                          title: p.title,
                          description: p.description,
                          coverUrl: p.coverUrl,
                          deliveryUrl: p.deliveryUrl ?? "",
                          deliveryNote: p.deliveryNote,
                          status: p.status,
                          price: p.priceCents ? String(p.priceCents / 100) : "",
                          currency: p.currency === "USD" ? "USD" : "INR",
                          type: p.type === "booking" ? "booking" : "download",
                          bookingUrl: p.bookingUrl,
                        },
                      })
                    }
                  >
                    <Pencil size={15} aria-hidden />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => setDeleting(p)}>
                    <Trash2 size={15} aria-hidden />
                  </IconButton>
                </div>
              </div>
            ))
          )}
          {full && <p className="text-xs text-muted-foreground">You&apos;ve reached {MAX_PRODUCTS} products.</p>}
        </div>

        <aside className="min-w-0 space-y-6">
          <Panel title="How it works">
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">1. Add a product</strong> with a link to the file: <BrandChip brand="googledrive" />,{" "}
                <BrandChip brand="dropbox" />, <BrandChip brand="notion" /> or any other link.
              </li>
              <li><strong className="font-medium text-foreground">2. Publish it.</strong> It appears in the Shop section of your kit.</li>
              <li><strong className="font-medium text-foreground">3. Fans enter their email</strong> (and pay, for paid products) and get the file on a private page, also sent by email. You see every buyer here.</li>
            </ol>
          </Panel>
          <Panel title="Payments" action={<Link href="/connectors" className="text-xs font-medium text-primary hover:underline">Connectors</Link>}>
            {connections === undefined ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : connections.length ? (
              <div className="space-y-2">
                {connections.map((c) => (
                  <div key={c.provider} className="flex flex-wrap items-center gap-2">
                    <BrandChip brand={c.provider === "stripe" ? "stripe" : "razorpay"} size={15} />
                    <Badge variant="success" dot>Connected</Badge>
                    {!c.livemode && <Badge variant="warning">Test mode</Badge>}
                  </div>
                ))}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Set a price on any product and buyers pay straight into your account{connections.length > 1 ? "; they choose Razorpay or Stripe at checkout" : ""}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  To sell for a price, connect <BrandChip brand="razorpay" /> or <BrandChip brand="stripe" /> once in Connectors. Free downloads work without it.
                </p>
                <ButtonLink href="/connectors" size="sm">Open Connectors</ButtonLink>
              </div>
            )}
          </Panel>
        </aside>
      </div>

      {editing && (
        <ProductEditor
          initial={editing}
          paymentsConnected={!!connections?.length}
          schedulers={schedulers}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setProducts((ps) => {
              const list = ps ?? [];
              return list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [...list, p];
            });
            setEditing(null);
          }}
        />
      )}
      {/* Keyed per product so each opening starts from an empty list. */}
      <LeadsDialog key={leadsFor?.id ?? "none"} product={leadsFor} onClose={() => setLeadsFor(null)} />
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this product?" description={deleting?.title || "Untitled"}>
        <p className="text-sm text-muted-foreground">It disappears from your kit, and the {deleting?.orders ?? 0} download record{deleting?.orders === 1 ? "" : "s"} for it are deleted too.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>Keep it</Button>
          <Button variant="danger" onClick={() => deleting && remove(deleting)}>Delete product</Button>
        </div>
      </Modal>
    </WorkspaceShell>
  );
}

function ProductEditor({
  initial,
  paymentsConnected,
  schedulers,
  onClose,
  onSaved,
}: {
  initial: { id: string | null; draft: Draft };
  paymentsConnected: boolean;
  schedulers: SchedulerConnection[];
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [d, setD] = useState<Draft>(initial.draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };

  async function pickCover(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError({ field: "coverUrl", message: "Choose an image file." });
    setCoverBusy(true);
    try {
      set({ coverUrl: await resizeImageFileToJpegDataUrl(file, { maxSide: 1200, maxChars: 190_000 }) });
    } catch {
      setError({ field: "coverUrl", message: "Couldn't use that image. Try a smaller one." });
    } finally {
      setCoverBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(status: Draft["status"]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(initial.id ? `/api/products/${initial.id}` : "/api/products", {
        method: initial.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...d, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError({ field: data.field, message: data.error ?? "Couldn't save. Try again." });
      onSaved({ ...data, orders: data.orders ?? 0 });
    } finally {
      setSaving(false);
    }
  }

  const err = (f: string) => (error?.field === f ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p> : null);
  const live = initial.draft.status === "published";

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={initial.id ? "Edit product" : "New product"}
      description={d.type === "booking" ? "A call people book on your own Calendly, Cal.com or Google Calendar." : "Free in exchange for an email, or for a price paid straight to you."}
      footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>Cancel</Button>
            {live ? (
              <Button onClick={() => save("draft")} disabled={saving}>Unpublish</Button>
            ) : (
              <Button onClick={() => save("draft")} disabled={saving}>Save draft</Button>
            )}
            <Button variant="primary" onClick={() => save("published")} disabled={saving || coverBusy}>
              {saving ? "Saving…" : live ? "Save changes" : "Publish"}
            </Button>
          </div>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Product type" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {([
            ["download", "Download", "A file people get"],
            ["booking", "Booking", "A call people book"],
          ] as const).map(([t, label, hint]) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={d.type === t}
              onClick={() => set(t === "booking" ? { type: t, bookingUrl: d.bookingUrl ?? schedulers[0]?.url ?? null } : { type: t })}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${d.type === t ? "bg-background shadow-sm" : "hover:bg-background/60"}`}
            >
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground hover:bg-muted"
            aria-label={d.coverUrl ? "Change cover image" : "Add a cover image"}
          >
            {d.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- base64 preview
              <img src={d.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={20} aria-hidden />
            )}
          </button>
          <div className="text-xs text-muted-foreground">
            <p>{coverBusy ? "Preparing image…" : "Cover image (optional). Landscape works best."}</p>
            {d.coverUrl && (
              <button type="button" onClick={() => set({ coverUrl: null })} className="mt-1 font-medium hover:text-foreground">Remove image</button>
            )}
            {err("coverUrl")}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pickCover(e.target.files?.[0])} />
        </div>

        <div>
          <label htmlFor="pr-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
          <input id="pr-title" value={d.title} maxLength={MAX_TITLE} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. My Lightroom preset pack" className={field} />
          {err("title")}
        </div>
        <div>
          <label htmlFor="pr-desc" className="mb-1.5 block text-xs font-medium text-muted-foreground">What&apos;s inside</label>
          <textarea id="pr-desc" rows={4} value={d.description} maxLength={MAX_DESCRIPTION} onChange={(e) => set({ description: e.target.value })} placeholder="Who it's for and what they get." className={`${field} resize-none`} />
        </div>
        {d.type === "booking" ? (
          <BookingSource draft={d} schedulers={schedulers} set={set} err={err} />
        ) : (
          <>
        <div>
          <label htmlFor="pr-price" className="mb-1.5 block text-xs font-medium text-muted-foreground">Price</label>
          <div className="flex gap-2">
            <select
              aria-label="Currency"
              value={d.currency}
              onChange={(e) => set({ currency: e.target.value })}
              className="w-24 shrink-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {PRODUCT_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === "INR" ? "₹ INR" : "$ USD"}</option>
              ))}
            </select>
            <input
              id="pr-price"
              inputMode="decimal"
              value={d.price}
              onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="0 = free download"
              className={field}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {Number(d.price) > 0
              ? paymentsConnected
                ? `Buyers pay ${formatPrice(Math.round(Number(d.price) * 100), d.currency)} straight into your own account. Kitevo takes 0%.`
                : "Connect Razorpay or Stripe in Connectors (sidebar) before publishing a paid product. Saving as a draft works now."
              : "Leave empty or 0 for a free download in exchange for an email."}
          </p>
          {err("priceCents")}
        </div>
        <div>
          <label htmlFor="pr-url" className="mb-1.5 block text-xs font-medium text-muted-foreground">Link to the file</label>
          <input id="pr-url" value={d.deliveryUrl ?? ""} onChange={(e) => set({ deliveryUrl: e.target.value })} placeholder="drive.google.com/… (set sharing to “anyone with the link”)" className={field} />
          <p className="mt-1 text-xs text-muted-foreground">Only shown on the buyer&apos;s private download page, after they sign up or pay.</p>
          {err("deliveryUrl")}
        </div>
        <div>
          <label htmlFor="pr-note" className="mb-1.5 block text-xs font-medium text-muted-foreground">Message on the download page (optional)</label>
          <textarea id="pr-note" rows={2} value={d.deliveryNote} maxLength={MAX_NOTE} onChange={(e) => set({ deliveryNote: e.target.value })} placeholder="e.g. How to install the presets." className={`${field} resize-none`} />
        </div>
          </>
        )}
        {error && !error.field && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
      </div>
    </Modal>
  );
}

function LeadsDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    fetch(`/api/products/${product.id}/orders`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Lead[]) => !cancelled && setLeads(rows))
      .catch(() => !cancelled && setLeads([]));
    return () => {
      cancelled = true;
    };
  }, [product]);

  return (
    <Modal open={!!product} onClose={onClose} size="md" title="Downloads" description={product?.title || "Untitled"}>
      {!leads ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No downloads yet. Share your kit or the product link to get the first one.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{leads.length} {leads.length === 1 ? "person" : "people"}</p>
            <Button
              size="sm"
              onClick={() =>
                navigator.clipboard?.writeText(leads.map((l) => l.buyerEmail).join(", ")).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : "Copy all emails"}
            </Button>
          </div>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {leads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{l.buyerEmail}</span>
                  {l.buyerName && <span className="block truncate text-xs text-muted-foreground">{l.buyerName}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
