import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseKitAppearance } from "@/lib/kit-appearance";
import { LogoMark } from "@/app/components/Logo";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { APP_URL, APP_HOST } from "@/lib/app-url";

const BASE_URL = APP_URL.replace(/\/$/, "");

// Routes that must not be matched by [username]
const RESERVED = new Set([
  "dashboard", "login", "signup", "pricing", "kit", "api", "profile",
  "onboarding", "help", "privacy", "terms", "forgot-password", "reset-password",
  "components", "favicon.ico", "robots.txt", "sitemap.xml",
]);

function parseLinks(raw: string | null): { label: string; url: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as { label?: string; url?: string }[]).filter(
      (x) => typeof x.label === "string" && typeof x.url === "string"
    ) as { label: string; url: string }[];
  } catch { return []; }
}

async function getCreatorProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      accountType: true,
      links: true,
      verifiedTier: true,
      brandProfile: { select: { companyName: true, logoUrl: true, description: true } },
      kits: {
        select: { id: true, name: true, slug: true, appearance: true, passwordHash: true },
        orderBy: { createdAt: "asc" },
      },
      campaigns: {
        where: { status: "open" },
        select: { id: true, title: true, description: true, niche: true, budget: true, deadline: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  return user;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  if (RESERVED.has(username)) return { title: "Not Found" };

  try {
    const user = await getCreatorProfile(username);
    if (!user) return { title: "Not Found" };

    const resolvedName = user.accountType === "brand"
      ? (user.brandProfile?.companyName ?? user.name ?? username)
      : (user.name ?? username);
    const resolvedBio = user.accountType === "brand"
      ? (user.brandProfile?.description ?? user.bio)
      : user.bio;
    const resolvedAvatar = user.accountType === "brand"
      ? (user.brandProfile?.logoUrl ?? user.avatarUrl)
      : user.avatarUrl;
    const title = `${resolvedName} — Kitevo`;
    const description = resolvedBio ?? `View ${resolvedName}'s media kits on Kitevo.`;
    const url = `${BASE_URL}/${username}`;
    const image = resolvedAvatar ?? `${BASE_URL}/og-default.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Kitevo",
        type: "profile",
        images: [{ url: image, width: 400, height: 400, alt: user.name ?? username }],
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: [image],
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: "Kitevo" };
  }
}

const VIBE_COLORS: Record<string, { bg: string; accent: string }> = {
  editorial: { bg: "#111110", accent: "#f5f0e8" },
  studio:    { bg: "#f0eeeb", accent: "#2d2d2b" },
  bloom:     { bg: "#f5ede4", accent: "#8b4513" },
  electric:  { bg: "#0A0A14", accent: "#6366f1" },
  noir:      { bg: "#1a1a18", accent: "#c9a84c" },
};

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (RESERVED.has(username)) notFound();

  const user = await getCreatorProfile(username).catch(() => null);
  if (!user) notFound();

  const links = parseLinks(user.links);
  const publicKits = user.kits.filter((k) => !k.passwordHash);
  const isBrand = user.accountType === "brand";
  const displayName = isBrand
    ? (user.brandProfile?.companyName ?? user.name ?? username)
    : (user.name ?? username);
  const avatarUrl = isBrand ? (user.brandProfile?.logoUrl ?? user.avatarUrl) : user.avatarUrl;
  const bio = isBrand ? (user.brandProfile?.description ?? user.bio) : user.bio;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-foreground inline-flex items-center gap-2 text-base font-semibold tracking-tight hover:opacity-70 transition-opacity">
            <LogoMark size={20} on="auto" />
            Kitevo
          </Link>
          <Link href="/signup" className="bg-foreground text-background rounded-full px-4 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity">
            Create your kit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 sm:px-8 pt-24 pb-24">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12">
          <div className="h-24 w-24 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted shadow-sm">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                width={96}
                height={96}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl font-display text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {displayName}
              </h1>
              <VerifiedBadge tier={user.verifiedTier} size="lg" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">@{username}</p>
            {bio && (
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-lg">{bio}</p>
            )}
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {links.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1 transition-colors"
                  >
                    {l.label || l.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand: open campaigns */}
        {isBrand ? (
          user.campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No open campaigns right now.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-4">
                Open campaigns
              </p>
              <div className="space-y-3">
                {user.campaigns.map((c) => {
                  const deadlineStr = c.deadline
                    ? new Date(c.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : null;
                  return (
                    <Link key={c.id} href={`/campaigns/${c.id}`} className="block rounded-2xl border border-border bg-background p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{c.title}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                              Open
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{c.description}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        {c.niche && (
                          <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full px-2.5 py-0.5">{c.niche}</span>
                        )}
                        {c.budget && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            {c.budget}
                          </span>
                        )}
                        {deadlineStr && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            Deadline {deadlineStr}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )
        ) : (
          /* Creator: media kits */
          publicKits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No public kits yet.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-4">
                Media kits
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publicKits.map((kit) => {
                  const appearance = parseKitAppearance(kit.appearance);
                  const vibe = appearance.preset ? VIBE_COLORS[appearance.preset] : null;
                  return (
                    <Link
                      key={kit.id}
                      href={`/kit/${kit.slug}`}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-background hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div
                        className="h-24 w-full flex items-center justify-center"
                        style={{ backgroundColor: vibe?.bg ?? "var(--color-muted)" }}
                      >
                        {avatarUrl && (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover border-2 opacity-90"
                            style={{ borderColor: vibe?.accent ?? "#fff" }}
                            width={48}
                            height={48}
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-foreground truncate">{kit.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{APP_HOST}/kit/{kit.slug}</p>
                        <p className="mt-3 text-xs font-medium text-foreground group-hover:underline">View kit</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )
        )}

        {/* Footer */}
        <p className="mt-16 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="hover:text-foreground transition-colors underline underline-offset-4">
            Kitevo
          </Link>
          {" · "}
          <Link href="/signup" className="hover:text-foreground transition-colors underline underline-offset-4">
            Create your free media kit
          </Link>
        </p>
      </main>
    </div>
  );
}
