import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kitAppearanceToCssVarsWithOverrides } from "@/lib/kit-appearance";
import { storefrontSeller } from "@/lib/creator-storefront";
import { LogoMark } from "@/app/components/Logo";
import { formatSlot, normalizeBookingConfig } from "@/lib/booking-shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * A buyer's private page (link in their email). Downloads: the only place the file link
 * appears. Bookings: the time (in the buyer's zone), the meeting link and calendar buttons.
 */
export default async function DeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({ where: { accessToken: token }, include: { product: true, booking: true } });
  if (!order || (order.status !== "free" && order.status !== "paid")) notFound();
  const booking = order.booking?.status === "confirmed" ? order.booking : null;
  const cfg = booking ? normalizeBookingConfig(order.product.bookingConfig) : null;
  if (booking ? !cfg?.meetingUrl : !order.product.deliveryUrl) notFound();
  const seller = await storefrontSeller(order.sellerId);
  const p = order.product;
  const tz = booking ? (booking.buyerTimezone ?? cfg!.timezone) : "UTC";
  const gcal = booking
    ? `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: `${p.title} with ${seller.name}`, dates: `${gcalStamp(booking.startsAt)}/${gcalStamp(booking.endsAt)}`, details: `Join: ${cfg!.meetingUrl}`, location: cfg!.meetingUrl })}`
    : null;
  return (
    <div className="min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased" style={kitAppearanceToCssVarsWithOverrides(seller.appearance)}>
      <header className="flex h-14 items-center justify-between border-b border-[var(--mk-border-hairline)] px-5 sm:px-8">
        <span className="flex items-center gap-2 font-sans text-sm text-[var(--mk-text-muted)]">
          {seller.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- base64 avatar
            <img src={seller.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : null}
          {seller.name}
        </span>
        <Link href="/" className="inline-flex items-center gap-1.5 font-display text-sm text-[var(--mk-text-muted)]">
          <LogoMark size={14} mono on="auto" /> Kitevo
        </Link>
      </header>

      {/* Same shape as the product page they signed up on: the product on the left, the
          download card on the right (sticky on desktop; straight after the title on phones). */}
      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-10 md:py-16">
        <div className="min-w-0 md:row-span-2">
          {p.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- base64 cover
            <img src={p.coverUrl} alt="" className="mb-8 aspect-[4/3] w-full rounded-2xl object-cover" />
          )}
          <p className="font-sans text-sm text-[var(--mk-text-muted)]">{booking ? `${cfg!.durationMin}-min call with` : "From"} {seller.name}</p>
          <h1 className="mt-2 text-balance font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight">{p.title}</h1>
        </div>

        <aside className="min-w-0 md:sticky md:top-8 md:col-start-2 md:row-start-1 md:self-start">
          <div className="rounded-2xl bg-[var(--mk-surface)] p-6">
            <p className="flex items-center gap-2 font-display text-xl font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mk-text)] text-[var(--mk-bg)]" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              {booking ? "You're booked" : "It's yours"}
            </p>
            {booking && (
              <div className="mt-4 rounded-xl border border-[var(--mk-border)] p-4">
                <p className="font-display text-2xl font-semibold leading-tight">{formatSlot(booking.startsAt.getTime(), tz)}</p>
                <p className="mt-1 font-sans text-xs text-[var(--mk-text-soft)]">
                  {cfg!.durationMin} min · {tz.replace(/_/g, " ")} time
                </p>
              </div>
            )}
            {p.deliveryNote && (
              <div className="mt-4 rounded-xl border border-[var(--mk-border)] p-4">
                <p className="font-sans text-xs font-medium text-[var(--mk-text-soft)]">A note from {seller.name}</p>
                <p className="mt-1 whitespace-pre-line font-sans text-sm leading-relaxed text-[var(--mk-text)]">{p.deliveryNote}</p>
              </div>
            )}
            <a
              href={booking ? cfg!.meetingUrl : p.deliveryUrl!}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[var(--mk-text)] font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90"
            >
              {booking ? "Join the call" : "Open your download"}
            </a>
            {booking && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href={gcal!} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center rounded-full border border-[var(--mk-border)] font-sans text-xs font-semibold text-[var(--mk-text)] hover:bg-[var(--mk-bg)]">
                  Google Calendar
                </a>
                <a href={`/o/${token}/calendar.ics`} className="flex h-10 items-center justify-center rounded-full border border-[var(--mk-border)] font-sans text-xs font-semibold text-[var(--mk-text)] hover:bg-[var(--mk-bg)]">
                  Apple / Outlook (.ics)
                </a>
              </div>
            )}
            <p className="mt-3 text-center font-sans text-xs leading-relaxed text-[var(--mk-text-soft)]">
              This page is private to you. Bookmark it or keep the email.
            </p>
          </div>
        </aside>

        {p.description && (
          <div className="min-w-0 max-w-prose whitespace-pre-line font-sans text-base leading-relaxed text-[var(--mk-text-muted)] md:col-start-1">
            {p.description}
          </div>
        )}
      </main>

      <footer className="mx-auto flex max-w-5xl items-center justify-between border-t border-[var(--mk-border-hairline)] px-5 py-6 font-sans text-xs text-[var(--mk-text-soft)] sm:px-8">
        {seller.kitSlug ? <Link href={`/kit/${seller.kitSlug}`} className="hover:text-[var(--mk-text)]">More from {seller.name}</Link> : <span />}
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-[var(--mk-text)]">
          <LogoMark size={13} mono on="auto" /> Made with Kitevo
        </Link>
      </footer>
    </div>
  );
}
