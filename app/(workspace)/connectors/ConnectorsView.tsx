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
import { ConnectStripeDialog } from "./ConnectStripeDialog";
import { ConnectPayPalDialog } from "./ConnectPayPalDialog";
import { ConnectSchedulerDialog, type SchedulerConnection } from "./ConnectSchedulerDialog";
import { SCHEDULERS, SCHEDULER_INFO, type Scheduler } from "@/lib/scheduler-links";

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

/**
 * One connector card. Every card in a row is the same height (grid stretch + h-full) and the
 * footer is pinned to the bottom (mt-auto), so actions line up across the row however long
 * the text above them is. `detail` is footer meta (key hint, link); `note` is a short caveat.
 */
function ConnectorCard({
  brand,
  name,
  powers,
  status,
  detail,
  note,
  actions,
  testMode,
}: {
  brand: BrandIconId;
  name: string;
  powers: string;
  status: Status;
  detail?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  /** Connected with test/sandbox keys: shown as a header badge next to Connected. */
  testMode?: string | false;
}) {
  const connected = status === "connected";
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-background p-5 transition-colors ${
        connected ? "border-green-600/25 dark:border-green-400/25" : "border-border"
      } ${status === "soon" ? "opacity-75" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
          <BrandIcon brand={brand} size={20} label={name} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</h3>
        {connected && <Badge variant="success" dot>Connected</Badge>}
        {connected && testMode && <Badge variant="warning">{testMode}</Badge>}
        {status === "soon" && <Badge>Coming soon</Badge>}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{powers}</p>
      {note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>}

      <div className="mt-auto pt-4">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {detail ?? (status === "off" ? "Not connected" : status === "loading" ? "Checking…" : null)}
          </div>
          {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        </div>
      </div>
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
  const [stripe, setStripe] = useState<Connection | null | undefined>(undefined);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [paypal, setPaypal] = useState<Connection | null | undefined>(undefined);
  const [paypalOpen, setPaypalOpen] = useState(false);
  const [schedulers, setSchedulers] = useState<SchedulerConnection[] | undefined>(undefined);
  const [schedOpen, setSchedOpen] = useState<Scheduler | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rpOpen, setRpOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const get = (url: string) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get("/api/instagram/status").then((d) => setInstagram(d?.connected === true));
    get("/api/youtube/status").then((d) => setYoutube(d?.connected === true));
    get("/api/scheduling/connections").then((rows: SchedulerConnection[] | null) => setSchedulers(rows ?? []));
    get("/api/payments/connections").then((rows: Connection[] | null) => {
      setRazorpay(rows?.find((c) => c.provider === "razorpay") ?? null);
      setStripe(rows?.find((c) => c.provider === "stripe") ?? null);
      setPaypal(rows?.find((c) => c.provider === "paypal") ?? null);
    });
  }, []);

  async function disconnectScheduler(p: Scheduler) {
    setBusy(p);
    try {
      const res = await fetch(`/api/scheduling/connections?provider=${p}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setSchedulers((xs) => (xs ?? []).filter((x) => x.provider !== p));
    } finally {
      setBusy(null);
      setConfirmOff(null);
    }
  }

  async function disconnect(which: "instagram" | "youtube" | "razorpay" | "stripe" | "paypal") {
    setBusy(which);
    try {
      const res =
        which === "razorpay" || which === "stripe" || which === "paypal"
          ? await fetch(`/api/payments/connections?provider=${which}`, { method: "DELETE", credentials: "include" })
          : await fetch(`/api/${which}/disconnect`, { method: "POST", credentials: "include" });
      if (res.ok) {
        if (which === "instagram") setInstagram(false);
        if (which === "youtube") setYoutube(false);
        if (which === "razorpay") setRazorpay(null);
        if (which === "stripe") setStripe(null);
        if (which === "paypal") setPaypal(null);
      }
    } finally {
      setBusy(null);
      setConfirmOff(null);
    }
  }

  const stat = (v: boolean | null): Status => (v === null ? "loading" : v ? "connected" : "off");

  const disconnectButton = (which: "instagram" | "youtube" | "razorpay" | "stripe" | "paypal", name: string, warn: string) =>
    confirmOff === which ? (
      <>
        <span className="basis-full text-right text-xs text-muted-foreground">{warn}</span>
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
          powers="Followers, engagement, posts, audience and growth."
          status={stat(instagram)}
          note={
            instagram === false ? (
              <>
                Needs a Professional account linked to a Facebook Page. <Link href="/help/instagram" className="font-medium text-primary hover:underline">Setup help</Link>
                {planNote && <> · {planNote}</>}
              </>
            ) : (
              planNote
            )
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
          powers="Subscribers, views per video and latest videos."
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
          powers="UPI, cards and netbanking, paid into your Razorpay account."
          status={razorpay === undefined ? "loading" : razorpay ? "connected" : "off"}
          detail={razorpay ? <span className="font-mono" title={razorpay.keyHint}>{razorpay.keyHint}</span> : undefined}
          testMode={!!razorpay && !razorpay.livemode && "Test mode"}
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
                {disconnectButton("razorpay", "Razorpay", stripe ? "Buyers will pay through Stripe only." : "Your paid products stop selling until you connect again.")}
              </>
            ) : (
              <Button size="sm" variant="primary" onClick={() => setRpOpen(true)}>Connect Razorpay</Button>
            )
          }
        />
        <ConnectorCard
          brand="stripe"
          name="Stripe"
          powers="Cards and wallets on Stripe's checkout, paid into your Stripe account."
          status={stripe === undefined ? "loading" : stripe ? "connected" : "off"}
          detail={stripe ? <span className="font-mono" title={stripe.keyHint}>{stripe.keyHint}</span> : undefined}
          testMode={!!stripe && !stripe.livemode && "Test mode"}
          note={
            !paidPlan ? (
              <>Selling paid products is included in Starter and Pro. <Link href="/pricing" className="font-medium text-primary hover:underline">See plans</Link></>
            ) : stripe && !stripe.livemode ? (
              "Test keys only accept Stripe's test cards. Switch to a live key before you start selling."
            ) : razorpay && !stripe ? (
              "Connect both and buyers choose: Razorpay for UPI, Stripe for international cards."
            ) : null
          }
          actions={
            stripe === undefined ? null : stripe ? (
              <>
                {confirmOff !== "stripe" && <Button size="sm" onClick={() => setStripeOpen(true)}>Update key</Button>}
                {disconnectButton("stripe", "Stripe", razorpay ? "Buyers will pay through Razorpay only." : "Your paid products stop selling until you connect again.")}
              </>
            ) : (
              <Button size="sm" variant="primary" onClick={() => setStripeOpen(true)}>Connect Stripe</Button>
            )
          }
        />
        <ConnectorCard
          brand="paypal"
          name="PayPal"
          powers="PayPal balance and cards, paid into your PayPal account. USD products."
          status={paypal === undefined ? "loading" : paypal ? "connected" : "off"}
          detail={paypal ? <span className="font-mono" title={paypal.keyHint}>{paypal.keyHint}</span> : undefined}
          testMode={!!paypal && !paypal.livemode && "Sandbox"}
          note={
            !paidPlan ? (
              <>Selling paid products is included in Starter and Pro. <Link href="/pricing" className="font-medium text-primary hover:underline">See plans</Link></>
            ) : paypal && !paypal.livemode ? (
              "Sandbox credentials only take PayPal test accounts. Switch to your Live app before you start selling."
            ) : null
          }
          actions={
            paypal === undefined ? null : paypal ? (
              <>
                {confirmOff !== "paypal" && <Button size="sm" onClick={() => setPaypalOpen(true)}>Update credentials</Button>}
                {disconnectButton("paypal", "PayPal", razorpay || stripe ? "Buyers will use your other payment accounts." : "Your paid products stop selling until you connect again.")}
              </>
            ) : (
              <Button size="sm" variant="primary" onClick={() => setPaypalOpen(true)}>Connect PayPal</Button>
            )
          }
        />
      </Section>

      <Section
        title="Scheduling"
        hint="Connect the scheduler you already use and Kitevo adds a Book a call button to your kit. Your availability, calendar conflicts and reminders stay in the scheduler."
      >
        {SCHEDULERS.map((p) => {
          const info = SCHEDULER_INFO[p];
          const c = schedulers?.find((x) => x.provider === p);
          return (
            <ConnectorCard
              key={p}
              brand={info.icon}
              name={p === "google" ? "Google Calendar" : info.name}
              powers={
                p === "google"
                  ? "An appointment schedule: people book open times on your calendar."
                  : `Your ${info.name} event types, embedded as bookable calls.`
              }
              status={schedulers === undefined ? "loading" : c ? "connected" : "off"}
              detail={c ? <span title={c.url}>{c.url.replace(/^https:\/\//, "")}</span> : undefined}
              actions={
                schedulers === undefined ? null : c ? (
                  confirmOff === p ? (
                    <>
                      <span className="basis-full text-right text-xs text-muted-foreground">Booking products using {info.name} stop showing until you connect again.</span>
                      <Button size="sm" onClick={() => setConfirmOff(null)} disabled={busy === p}>Keep connected</Button>
                      <Button size="sm" variant="danger" onClick={() => disconnectScheduler(p)} disabled={busy === p}>{busy === p ? "Disconnecting…" : `Disconnect ${info.name}`}</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setSchedOpen(p)}>Change link</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmOff(p)}>Disconnect</Button>
                    </>
                  )
                ) : (
                  <Button size="sm" variant="primary" onClick={() => setSchedOpen(p)}>Connect {p === "google" ? "Google Calendar" : info.name}</Button>
                )
              }
            />
          );
        })}
      </Section>

      <p className="text-sm text-muted-foreground">
        Selling something? Set a price on any product in <Link href="/products" className="font-medium text-primary hover:underline">Products</Link>; its buy link is created for you.
      </p>

      <ConnectPayPalDialog
        open={paypalOpen}
        onClose={() => setPaypalOpen(false)}
        onConnected={(c) => {
          setPaypal(c);
          setPaypalOpen(false);
          setFlash(`PayPal connected${c.livemode ? "" : " in sandbox mode"}. USD products can now take PayPal payments.`);
        }}
      />
      <ConnectSchedulerDialog
        provider={schedOpen}
        onClose={() => setSchedOpen(null)}
        onConnected={(c) => {
          setSchedulers((xs) => [...(xs ?? []).filter((x) => x.provider !== c.provider), c]);
          setSchedOpen(null);
          setFlash(`${SCHEDULER_INFO[c.provider].name} connected. Turn on Book a call in your kit editor's Contact card.`);
        }}
      />
      <ConnectStripeDialog
        open={stripeOpen}
        onClose={() => setStripeOpen(false)}
        onConnected={(c) => {
          setStripe(c);
          setStripeOpen(false);
          setFlash(`Stripe connected${c.livemode ? "" : " in test mode"}. Your paid products can now take card payments.`);
        }}
      />
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
