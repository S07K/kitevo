"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { Badge } from "@/app/components/Badge";
import { BrandIcon } from "@/app/components/BrandIcon";
import type { BrandIconId } from "@/lib/brand-icons";
import { INSTAGRAM_ERROR_MESSAGES, YOUTUBE_RESULT_MESSAGES } from "@/lib/connect-messages";
import { ConnectRazorpayDialog, type Connection } from "./ConnectRazorpayDialog";

function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  const cls =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  return (
    <div role={tone === "success" ? "status" : "alert"} className={`mb-6 rounded-xl border p-4 text-sm ${cls}`}>
      {children}
    </div>
  );
}

type Status = "connected" | "off" | "soon" | "loading";

/** One connector: logo, what it powers, status, and its connect/disconnect action. */
function ConnectorCard({
  brand,
  name,
  powers,
  status,
  detail,
  note,
  actions,
}: {
  brand: BrandIconId;
  name: string;
  powers: string;
  status: Status;
  detail?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border border-border bg-background p-5 ${status === "soon" ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
          <BrandIcon brand={brand} size={22} label={name} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            {status === "connected" && <Badge variant="success" dot>Connected</Badge>}
            {status === "soon" && <Badge>Coming soon</Badge>}
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{powers}</p>
          {detail && <div className="mt-1.5 text-xs text-muted-foreground">{detail}</div>}
        </div>
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>}
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">{actions}</div>}
    </article>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{hint}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export function ConnectorsView({ paidPlan }: { paidPlan: boolean }) {
  const params = useSearchParams();
  const igOk = params.get("instagram_connected");
  const igErr = params.get("instagram_error");
  const yt = params.get("youtube");

  const [instagram, setInstagram] = useState<boolean | null>(null);
  const [youtube, setYoutube] = useState<boolean | null>(null);
  const [razorpay, setRazorpay] = useState<Connection | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [rpOpen, setRpOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const get = (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get("/api/instagram/status").then((d) => setInstagram(d?.connected === true));
    get("/api/youtube/status").then((d) => setYoutube(d?.connected === true));
    get("/api/payments/connections").then((rows: Connection[] | null) => setRazorpay(rows?.find((c) => c.provider === "razorpay") ?? null));
  }, []);

  async function disconnect(which: "instagram" | "youtube" | "razorpay") {
    setBusy(which);
    try {
      const res =
        which === "razorpay"
          ? await fetch("/api/payments/connections?provider=razorpay", { method: "DELETE", credentials: "include" })
          : await fetch(`/api/${which}/disconnect`, { method: "POST", credentials: "include" });
      if (res.ok) {
        if (which === "instagram") setInstagram(false);
        if (which === "youtube") setYoutube(false);
        if (which === "razorpay") setRazorpay(null);
      }
    } finally {
      setBusy(null);
      setConfirmOff(null);
    }
  }

  const stat = (v: boolean | null): Status => (v === null ? "loading" : v ? "connected" : "off");

  const disconnectButton = (which: "instagram" | "youtube" | "razorpay", name: string, warn: string) =>
    confirmOff === which ? (
      <>
        <span className="w-full text-xs text-muted-foreground">{warn}</span>
        <Button size="sm" onClick={() => setConfirmOff(null)} disabled={busy === which}>Keep connected</Button>
        <Button size="sm" variant="danger" onClick={() => disconnect(which)} disabled={busy === which}>
          {busy === which ? "Disconnecting…" : `Disconnect ${name}`}
        </Button>
      </>
    ) : (
      <Button size="sm" variant="ghost" onClick={() => setConfirmOff(which)}>Disconnect</Button>
    );

  const planNote = !paidPlan ? (
    <>
      Shows on your public kit with Starter or Pro. <Link href="/pricing" className="font-medium text-primary hover:underline">See plans</Link>
    </>
  ) : null;

  return (
    <WorkspaceShell variant="creator" width="wide">
      <PageHeader
        eyebrow="Setup"
        title="Connectors"
        description="Connect your accounts once. Your kit and your products use them automatically."
      />

      {igOk && <Notice tone="success">Instagram connected. Your stats will now load from your account.</Notice>}
      {igErr && <Notice tone="danger">{INSTAGRAM_ERROR_MESSAGES[igErr] ?? "Instagram connection failed. Try again."}</Notice>}
      {yt && YOUTUBE_RESULT_MESSAGES[yt] && <Notice tone={YOUTUBE_RESULT_MESSAGES[yt].tone}>{YOUTUBE_RESULT_MESSAGES[yt].text}</Notice>}
      {flash && <Notice tone="success">{flash}</Notice>}

      <Section title="Stats for your kit" hint="Your kit shows live numbers from these accounts. Kitevo only reads them; it never posts, edits or deletes anything.">
        <ConnectorCard
          brand="instagram"
          name="Instagram"
          powers="Followers, engagement, recent posts, audience and growth."
          status={stat(instagram)}
          note={planNote}
          detail={
            instagram === false ? (
              <>Needs a Professional account linked to a Facebook Page. <Link href="/help/instagram" className="font-medium text-primary hover:underline">Setup help</Link></>
            ) : undefined
          }
          actions={
            instagram === null ? null : instagram ? (
              disconnectButton("instagram", "Instagram", "Your kit falls back to the numbers you entered yourself.")
            ) : (
              <ButtonLink href="/api/instagram/connect?return_to=connectors" variant="primary" size="sm">Connect Instagram</ButtonLink>
            )
          }
        />
        <ConnectorCard
          brand="youtube"
          name="YouTube"
          powers="Subscribers, views per video and your latest videos."
          status={stat(youtube)}
          note={planNote}
          actions={
            youtube === null ? null : youtube ? (
              disconnectButton("youtube", "YouTube", "Your kit falls back to the numbers you entered yourself.")
            ) : (
              <ButtonLink href="/api/youtube/connect?return_to=connectors" variant="primary" size="sm">Connect YouTube</ButtonLink>
            )
          }
        />
      </Section>

      <Section title="Payments for your products" hint="Buyers pay straight into your own account. Connect once; every paid product uses it. Kitevo takes 0% and never holds your money.">
        <ConnectorCard
          brand="razorpay"
          name="Razorpay"
          powers="UPI, cards and the other methods your Razorpay account accepts."
          status={razorpay === undefined ? "loading" : razorpay ? "connected" : "off"}
          detail={
            razorpay ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-mono">{razorpay.keyHint}</span>
                {!razorpay.livemode && <Badge variant="warning">Test mode</Badge>}
              </span>
            ) : undefined
          }
          note={
            !paidPlan ? (
              <>Selling paid products is included in Starter and Pro. <Link href="/pricing" className="font-medium text-primary hover:underline">See plans</Link></>
            ) : razorpay && !razorpay.livemode ? (
              "Test keys only accept Razorpay's test payments. Switch to live keys before you start selling."
            ) : null
          }
          actions={
            razorpay === undefined ? null : razorpay ? (
              <>
                {confirmOff !== "razorpay" && <Button size="sm" onClick={() => setRpOpen(true)}>Update keys</Button>}
                {disconnectButton("razorpay", "Razorpay", "Your paid products stop selling until you connect again.")}
              </>
            ) : (
              <Button size="sm" variant="primary" onClick={() => setRpOpen(true)}>Connect Razorpay</Button>
            )
          }
        />
        <ConnectorCard brand="stripe" name="Stripe" powers="Card payments into your own Stripe account." status="soon" />
        <ConnectorCard brand="paypal" name="PayPal" powers="PayPal payments into your own PayPal account." status="soon" />
      </Section>

      <p className="text-sm text-muted-foreground">
        Selling something? Set a price on any product in <Link href="/products" className="font-medium text-primary hover:underline">Products</Link>; its buy link is created for you.
      </p>

      <ConnectRazorpayDialog
        open={rpOpen}
        onClose={() => setRpOpen(false)}
        onConnected={(c) => {
          setRazorpay(c);
          setRpOpen(false);
          setFlash(`Razorpay connected${c.livemode ? "" : " in test mode"}. Your paid products can now take payments.`);
        }}
      />
    </WorkspaceShell>
  );
}
