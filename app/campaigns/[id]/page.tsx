import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplySection } from "./ApplySection";
import { AppSidebar } from "@/app/components/AppSidebar";
import { AppNav } from "@/app/components/AppNav";

type Params = { id: string };

async function getCampaign(id: string) {
  return prisma.campaign.findFirst({
    where: { id, status: "open" },
    select: {
      id: true,
      title: true,
      description: true,
      niche: true,
      budget: true,
      deadline: true,
      status: true,
      createdAt: true,
      _count: { select: { applications: true } },
      brand: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          brandProfile: {
            select: {
              companyName: true,
              industry: true,
              logoUrl: true,
              website: true,
              description: true,
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return { title: "Campaign not found" };

  const company =
    campaign.brand.brandProfile?.companyName ?? campaign.brand.name ?? "Brand";
  const description =
    campaign.description.slice(0, 155) + (campaign.description.length > 155 ? "…" : "");
  const image = campaign.brand.brandProfile?.logoUrl ?? campaign.brand.avatarUrl;

  return {
    title: `${campaign.title} — ${company} | Kitevo`,
    description,
    openGraph: {
      title: `${campaign.title} — ${company}`,
      description,
      images: image ? [{ url: image, width: 400, height: 400 }] : [],
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${campaign.title} — ${company}`,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function CampaignDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [campaign, session] = await Promise.all([
    getCampaign(id),
    getServerSession(authOptions),
  ]);

  if (!campaign) notFound();

  // Check if the logged-in user already applied
  let myApplicationStatus: string | null = null;
  if (session?.user?.id) {
    const app = await prisma.campaignApplication.findFirst({
      where: { campaignId: id, creatorId: session.user.id },
      select: { status: true },
    });
    myApplicationStatus = app?.status ?? null;
  }

  const company =
    campaign.brand.brandProfile?.companyName ?? campaign.brand.name ?? "Brand";
  const logo = campaign.brand.brandProfile?.logoUrl ?? campaign.brand.avatarUrl;
  const daysLeft = campaign.deadline
    ? Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        links={[{ href: "/dashboard", label: "Dashboard" }]}
        onLogout={undefined}
      />
      <AppSidebar tabs={[
        { href: "/social/campaigns", label: "Campaigns" },
        { href: "/social/inbox", label: "Inbox" },
      ]} />

      <main className="md:ml-52 px-5 pt-[73px] pb-[72px] md:pb-20 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-8 py-6">
          {/* Back */}
          <Link
            href="/social/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to campaigns
          </Link>

          {/* Brand card */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
              {logo ? (
                <img src={logo} alt={company} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                  {company.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{company}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {campaign.brand.brandProfile?.industry && (
                  <span className="text-xs text-muted-foreground">{campaign.brand.brandProfile.industry}</span>
                )}
                {campaign.brand.brandProfile?.website && (
                  <>
                    <span className="text-muted-foreground/30 text-xs">·</span>
                    <a
                      href={campaign.brand.brandProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {campaign.brand.brandProfile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Title + meta chips */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight leading-snug mb-4">
              {campaign.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              {campaign.niche && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {campaign.niche}
                </span>
              )}
              {campaign.budget && (
                <span className="inline-flex items-center text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border">
                  💰 {campaign.budget}
                </span>
              )}
              {daysLeft !== null && (
                <span className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border ${
                  daysLeft <= 3
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
                    : "bg-muted text-foreground border-border"
                }`}>
                  📅 {daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}
                </span>
              )}
              <span className="inline-flex items-center text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border">
                {campaign._count.applications} applicant{campaign._count.applications !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Brief */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Campaign Brief</h2>
            <div className="space-y-3">
              {campaign.description.split("\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm text-foreground leading-relaxed">{para}</p>
              ))}
            </div>
          </div>

          {/* About brand */}
          {campaign.brand.brandProfile?.description && (
            <>
              <div className="border-t border-border" />
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">About {company}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{campaign.brand.brandProfile.description}</p>
              </div>
            </>
          )}

          <div className="border-t border-border" />

          {/* Apply — client component handles interactivity */}
          {session?.user ? (
            <ApplySection campaignId={id} initialStatus={myApplicationStatus} />
          ) : (
            <div className="rounded-2xl border border-border bg-muted/20 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">Want to apply?</p>
              <p className="text-xs text-muted-foreground mb-4">Create a free creator account to pitch to this brand.</p>
              <Link
                href={`/auth?next=/campaigns/${id}`}
                className="inline-flex h-10 items-center px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
