import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordCampaignView } from "@/lib/campaign-views";
import { ApplySection } from "./ApplySection";
import { Badge } from "@/app/components/Badge";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { WorkspaceShell, Panel } from "@/app/components/workspace/WorkspaceShell";
import { ButtonLink } from "@/app/components/workspace/Button";

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
          verifiedTier: true,
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

  // Record a view (exclude the brand viewing its own campaign).
  if (session?.user?.id !== campaign.brand.id) {
    const referrer = (await headers()).get("referer") ?? undefined;
    await recordCampaignView(campaign.id, { viewerId: session?.user?.id ?? null, referrer });
  }

  // Check if the logged-in creator already applied + conversation with brand
  let myApplication: { id: string; status: string; createdAt: Date } | null = null;
  let hasConversation = false;
  if (session?.user?.id) {
    const [app, convo] = await Promise.all([
      prisma.campaignApplication.findFirst({
        where: { campaignId: id, creatorId: session.user.id },
        select: { id: true, status: true, createdAt: true },
      }),
      prisma.conversation.findFirst({
        where: {
          participants: { some: { userId: session.user.id } },
          AND: [{ participants: { some: { userId: campaign.brand.id } } }],
        },
        select: { id: true },
      }),
    ]);
    myApplication = app ?? null;
    hasConversation = !!convo;
  }

  const company =
    campaign.brand.brandProfile?.companyName ?? campaign.brand.name ?? "Brand";
  const logo = campaign.brand.brandProfile?.logoUrl ?? campaign.brand.avatarUrl;
  const daysLeft = campaign.deadline
    ? Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000)
    : null;

  const applicants = campaign._count.applications;
  const facts: Array<{ label: string; value: string }> = [
    ...(campaign.budget ? [{ label: "Budget", value: campaign.budget }] : []),
    ...(campaign.niche ? [{ label: "Niche", value: campaign.niche }] : []),
    ...(campaign.deadline
      ? [
          {
            label: "Apply by",
            value: `${new Date(campaign.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}${
              daysLeft !== null ? (daysLeft > 0 ? ` · ${daysLeft}d left` : " · closing soon") : ""
            }`,
          },
        ]
      : []),
    { label: "Applicants", value: String(applicants) },
    { label: "Posted", value: new Date(campaign.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
  ];
  const website = campaign.brand.brandProfile?.website ?? null;

  return (
    <WorkspaceShell width="wide">
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} aria-hidden /> Back to campaigns
      </Link>

      {/* Header: brand + title, like a PageHeader */}
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- base64 data URL
              <img src={logo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">{company.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">{company}</p>
          <VerifiedBadge tier={campaign.brand.verifiedTier} size="sm" />
          {campaign.brand.brandProfile?.industry && <span className="text-sm text-muted-foreground">· {campaign.brand.brandProfile.industry}</span>}
        </div>
        <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">{campaign.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {campaign.niche && <Badge variant="default">{campaign.niche}</Badge>}
          {campaign.budget && <Badge variant="accent">{campaign.budget}</Badge>}
          {daysLeft !== null && <Badge variant={daysLeft <= 3 ? "danger" : "warning"}>{daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}</Badge>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main: the brief ── */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel title="Campaign brief">
            <div className="space-y-3">
              {campaign.description
                .split("\n")
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-foreground">
                    {para}
                  </p>
                ))}
            </div>
          </Panel>

          {(campaign.brand.brandProfile?.description || website) && (
            <Panel title={`About ${company}`}>
              {campaign.brand.brandProfile?.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{campaign.brand.brandProfile.description}</p>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline ${campaign.brand.brandProfile?.description ? "mt-3" : ""}`}
                >
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink size={12} aria-hidden />
                </a>
              )}
            </Panel>
          )}
        </div>

        {/* ── Rail: apply + facts ── */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-[89px] lg:self-start">
          <Panel title={myApplication ? "Your application" : "Apply"}>
            {session?.user ? (
              <ApplySection
                campaignId={id}
                initialStatus={myApplication?.status ?? null}
                appliedAt={myApplication?.createdAt?.toISOString() ?? null}
                reviewedAt={null}
                hasConversation={hasConversation}
                applicationId={myApplication?.id ?? null}
              />
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Create a free creator account to pitch to this brand.</p>
                <ButtonLink href={`/auth?next=/campaigns/${id}`} variant="primary" size="lg" className="mt-4 w-full">
                  Sign up free
                </ButtonLink>
              </div>
            )}
          </Panel>

          <Panel title="At a glance">
            <dl className="divide-y divide-border">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-right text-sm font-medium tabular-nums text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
