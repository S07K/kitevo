import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS = require("pptxgenjs");
import { parseKitAppearance } from "@/lib/kit-appearance";
import { getStatsForUser } from "@/lib/instagram-api";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import { APP_URL, APP_HOST } from "@/lib/app-url";

function pj<T>(raw: string, fallback: T): T {
  try { return (JSON.parse(raw) ?? fallback) as T; }
  catch { return fallback; }
}

// Per-preset: cover (dark slide) + accent for content slides
const THEME: Record<string, { coverBg: string; coverFg: string; coverMuted: string; accent: string; accentLight: string }> = {
  editorial: { coverBg: "111110", coverFg: "F5F0E8", coverMuted: "786E60", accent: "B89A50", accentLight: "F5EDD0" },
  studio:    { coverBg: "2D2D2B", coverFg: "E8E6E1", coverMuted: "888880", accent: "4A4A48", accentLight: "E8E6E1" },
  noir:      { coverBg: "1A1A18", coverFg: "C9A84C", coverMuted: "665A30", accent: "C9A84C", accentLight: "FDF0C8" },
  bloom:     { coverBg: "3D200E", coverFg: "E8B08A", coverMuted: "7A5040", accent: "C97B4B", accentLight: "FAE8DC" },
  electric:  { coverBg: "0D0D1A", coverFg: "A5A8FC", coverMuted: "4848A0", accent: "6366F1", accentLight: "E8E8FF" },
  warm:      { coverBg: "1A1A18", coverFg: "F0EBE2", coverMuted: "888878", accent: "8B7355", accentLight: "F0EBE2" },
  cool:      { coverBg: "1E3A5F", coverFg: "C8DAF0", coverMuted: "507090", accent: "1E3A5F", accentLight: "D8E8F8" },
  paper:     { coverBg: "111111", coverFg: "FAFAF8", coverMuted: "666666", accent: "333333", accentLight: "F0F0EE" },
};

const DEFAULT_THEME = THEME.warm;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function pct(n: number): string {
  return n.toFixed(2) + "%";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [kit, user] = await Promise.all([
    prisma.kit.findFirst({ where: { id, userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, username: true, bio: true, avatarUrl: true, links: true, email: true, instagramUserId: true, instagramAccessToken: true },
    }),
  ]);
  if (!kit || !user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appearance = parseKitAppearance(kit.appearance);
  const theme = THEME[appearance.preset as string] ?? DEFAULT_THEME;
  const workSamples = pj<WorkSample[]>(kit.workSamples, []);
  const rates = pj<KitRates>(kit.rates, { show: false });
  const brands = pj<BrandPartner[]>(kit.brands, []);
  const links = pj<{ label: string; url: string }[]>(user.links ?? "[]", []);
  const creatorName = user.name ?? "Creator";
  const username = user.username ?? "";
  const bio = user.bio ?? "";
  const appUrl = APP_URL;
  const kitUrl = `${appUrl}/kit/${kit.slug}`;

  let igStats: { followers: number; avgEngagement: number; growthThisMonth: number } | null = null;
  if (user?.instagramUserId && user?.instagramAccessToken) {
    try {
      const raw = await getStatsForUser(session.user.id);
      if (raw.followers > 0) igStats = { followers: raw.followers, avgEngagement: raw.avgEngagement, growthThisMonth: raw.growthThisMonth };
    } catch { /* non-fatal */ }
  }

  // ─── Build presentation ───────────────────────────────────────────────
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
  pres.author = creatorName;
  pres.title = `${kit.name} – Media Kit`;

  const W = 10, H = 5.625;
  const MARGIN = 0.6;
  const CW = W - MARGIN * 2; // 8.8"

  // ─── Slide 1: Cover ───────────────────────────────────────────────────
  const s1 = pres.addSlide();
  s1.background = { color: theme.coverBg };

  // Decorative large circle top-right
  s1.addShape("ellipse", {
    x: 6.5, y: -1.8, w: 5.5, h: 5.5,
    fill: { color: theme.coverFg, transparency: 92 },
    line: { color: theme.coverFg, transparency: 80, width: 0.5 },
  });

  // "MEDIA KIT" badge top-left
  s1.addText("MEDIA KIT", {
    x: MARGIN, y: 0.38, w: 3, h: 0.28,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: theme.coverMuted, charSpacing: 5, margin: 0,
  });

  // Year top-right
  s1.addText(String(new Date().getFullYear()), {
    x: W - MARGIN - 1, y: 0.38, w: 1, h: 0.28,
    fontSize: 9, fontFace: "Calibri", color: theme.coverMuted,
    align: "right", margin: 0,
  });

  // Avatar (circular)
  if (user.avatarUrl) {
    try {
      s1.addImage({ path: user.avatarUrl, x: MARGIN, y: 1.05, w: 1.55, h: 1.55, rounding: true });
    } catch { /* avatar load failed — skip */ }
  }

  // Name
  s1.addText(creatorName, {
    x: MARGIN, y: 2.78, w: CW * 0.72, h: 0.78,
    fontSize: 42, fontFace: "Cambria", bold: true,
    color: theme.coverFg, margin: 0,
  });

  // Username
  if (username) {
    s1.addText(`@${username}`, {
      x: MARGIN, y: 3.56, w: CW * 0.7, h: 0.32,
      fontSize: 13, fontFace: "Calibri",
      color: theme.coverMuted, margin: 0,
    });
  }

  // Bio (truncated to ~120 chars)
  const bioText = bio.length > 120 ? bio.slice(0, 117) + "…" : bio;
  if (bioText) {
    s1.addText(bioText, {
      x: MARGIN, y: 3.96, w: CW * 0.78, h: 0.8,
      fontSize: 12, fontFace: "Calibri",
      color: theme.coverMuted, margin: 0,
    });
  }

  // Bottom: kit URL
  s1.addText(kitUrl, {
    x: MARGIN, y: H - 0.45, w: CW * 0.7, h: 0.28,
    fontSize: 9, fontFace: "Calibri", color: theme.coverMuted,
    margin: 0,
  });

  // Links (top 3) bottom right
  const topLinks = links.slice(0, 3);
  topLinks.forEach((l, i) => {
    s1.addText(`${l.label}  ↗`, {
      x: W - 2.8, y: H - 0.45 - (topLinks.length - i - 1) * 0.3, w: 2.2, h: 0.25,
      fontSize: 9, fontFace: "Calibri", color: theme.coverMuted,
      align: "right", margin: 0,
      hyperlink: l.url.startsWith("http") ? { url: l.url } : undefined,
    });
  });

  // ─── Slide 2: Stats ───────────────────────────────────────────────────
  const s2 = pres.addSlide();
  s2.background = { color: "FFFFFF" };

  s2.addText("AUDIENCE & PERFORMANCE", {
    x: MARGIN, y: 0.42, w: CW, h: 0.28,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: theme.accent, charSpacing: 4, margin: 0,
  });
  s2.addText("Reach & engagement data", {
    x: MARGIN, y: 0.76, w: 5, h: 0.35,
    fontSize: 22, fontFace: "Cambria", bold: true,
    color: "111111", margin: 0,
  });

  if (igStats) {
    const stats = [
      { label: "Followers", value: fmt(igStats.followers) },
      { label: "Avg Engagement", value: pct(igStats.avgEngagement) },
      { label: "Monthly Growth", value: fmt(igStats.growthThisMonth >= 0 ? igStats.growthThisMonth : 0) },
    ];
    const cardW = 2.7, cardH = 2.4, cardGap = 0.35;
    const totalW = stats.length * cardW + (stats.length - 1) * cardGap;
    const startX = (W - totalW) / 2;

    stats.forEach((stat, i) => {
      const cx = startX + i * (cardW + cardGap);
      const cy = 1.55;
      s2.addShape("roundRect", {
        x: cx, y: cy, w: cardW, h: cardH,
        fill: { color: theme.accentLight },
        line: { color: "E8E8E8", width: 0.5 },
        rectRadius: 0.12,
        shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.06 },
      });
      s2.addText(stat.value, {
        x: cx, y: cy + 0.55, w: cardW, h: 0.85,
        fontSize: 36, fontFace: "Cambria", bold: true,
        color: theme.accent, align: "center", margin: 0,
      });
      s2.addText(stat.label, {
        x: cx, y: cy + 1.5, w: cardW, h: 0.3,
        fontSize: 11, fontFace: "Calibri",
        color: "888888", align: "center", margin: 0,
      });
    });

    // Engagement bar chart
    if (igStats.avgEngagement > 0) {
      s2.addChart("bar",
        [{ name: "Rate", labels: ["Engagement Rate"], values: [parseFloat(igStats.avgEngagement.toFixed(2))] }],
        {
          x: 7.2, y: 1.6, w: 2.2, h: 2.2,
          barDir: "col",
          chartColors: [theme.accent],
          chartArea: { fill: { color: "FFFFFF" } },
          catGridLine: { style: "none" },
          valGridLine: { color: "E8E8E8", size: 0.5 },
          catAxisLabelColor: "AAAAAA",
          valAxisLabelColor: "AAAAAA",
          showValue: true,
          dataLabelColor: theme.accent,
          showLegend: false,
          showTitle: false,
        }
      );
    }
  } else {
    s2.addShape("roundRect", {
      x: MARGIN, y: 1.55, w: CW, h: 2.8,
      fill: { color: "F8F8F8" },
      line: { color: "E8E8E8", width: 0.5 },
      rectRadius: 0.12,
    });
    s2.addText("Connect Instagram to display live audience stats", {
      x: MARGIN, y: 2.5, w: CW, h: 0.4,
      fontSize: 14, fontFace: "Calibri", color: "AAAAAA",
      align: "center", margin: 0,
    });
    s2.addText("Visit your Kitevo profile settings to connect your account.", {
      x: MARGIN, y: 3.0, w: CW, h: 0.3,
      fontSize: 11, fontFace: "Calibri", color: "CCCCCC",
      align: "center", margin: 0,
    });
  }

  // Platform note bottom
  s2.addText(`Data via Instagram Graph API · ${APP_HOST}`, {
    x: MARGIN, y: H - 0.38, w: CW, h: 0.25,
    fontSize: 8, fontFace: "Calibri", color: "CCCCCC", margin: 0,
  });

  // ─── Slide 3: Rates ───────────────────────────────────────────────────
  const s3 = pres.addSlide();
  s3.background = { color: "FFFFFF" };

  s3.addText("COLLABORATION PACKAGES", {
    x: MARGIN, y: 0.42, w: CW, h: 0.28,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: theme.accent, charSpacing: 4, margin: 0,
  });
  s3.addText("Work with me", {
    x: MARGIN, y: 0.76, w: 5, h: 0.35,
    fontSize: 22, fontFace: "Cambria", bold: true,
    color: "111111", margin: 0,
  });

  // Content types from work samples
  const platforms = [...new Set(workSamples.map((w) => w.platform))];
  const contentTypes: { label: string; value: string }[] = platforms.map((p) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    value: workSamples.filter((w) => w.platform === p).length + " samples",
  }));

  if (rates.show) {
    // Show pricing info
    const priceCard = { label: "Starting from", value: rates.fromAmount ? `$${rates.fromAmount.toLocaleString()}` : "On request" };
    const ctaCard = { label: "Next step", value: rates.ctaLabel ?? "Get in touch" };
    const cards = [priceCard, ctaCard, ...contentTypes.slice(0, 4)];

    const colW = 2.7, colGap = 0.35, rowH = 1.8, rowGap = 0.3;
    const cols = 3;
    cards.slice(0, 6).forEach((card, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = MARGIN + col * (colW + colGap);
      const y = 1.45 + row * (rowH + rowGap);

      s3.addShape("roundRect", {
        x, y, w: colW, h: rowH,
        fill: { color: i === 0 ? theme.accentLight : "F8F8F8" },
        line: { color: "E8E8E8", width: 0.5 },
        rectRadius: 0.1,
        shadow: { type: "outer", color: "000000", blur: 6, offset: 1, angle: 90, opacity: 0.05 },
      });
      s3.addText(card.value, {
        x: x + 0.18, y: y + 0.35, w: colW - 0.36, h: 0.65,
        fontSize: i === 0 ? 26 : 16, fontFace: "Cambria", bold: true,
        color: i === 0 ? theme.accent : "222222", align: "center", margin: 0,
      });
      s3.addText(card.label, {
        x: x + 0.18, y: y + 1.12, w: colW - 0.36, h: 0.28,
        fontSize: 10, fontFace: "Calibri", color: "999999",
        align: "center", margin: 0,
      });
    });
  } else {
    // No rates — show content capabilities
    s3.addShape("roundRect", {
      x: MARGIN, y: 1.45, w: CW, h: 2.6,
      fill: { color: theme.accentLight },
      line: { color: "E8E8E8", width: 0.5 },
      rectRadius: 0.14,
    });
    s3.addText("Rates on request", {
      x: MARGIN, y: 2.2, w: CW, h: 0.55,
      fontSize: 28, fontFace: "Cambria", bold: true,
      color: theme.accent, align: "center", margin: 0,
    });
    s3.addText(rates.ctaLabel ?? "Get in touch to discuss collaboration opportunities", {
      x: MARGIN, y: 2.85, w: CW, h: 0.3,
      fontSize: 12, fontFace: "Calibri", color: "888888",
      align: "center", margin: 0,
    });
    s3.addText(kitUrl, {
      x: MARGIN, y: 3.25, w: CW, h: 0.28,
      fontSize: 11, fontFace: "Calibri", color: theme.accent,
      align: "center", margin: 0,
      hyperlink: { url: kitUrl },
    });
  }

  // Platform footer
  if (platforms.length > 0) {
    s3.addText(`Content: ${platforms.join(", ")}`, {
      x: MARGIN, y: H - 0.38, w: CW, h: 0.25,
      fontSize: 8, fontFace: "Calibri", color: "CCCCCC", margin: 0,
    });
  }

  // ─── Slide 4: Brands + CTA ───────────────────────────────────────────
  const s4 = pres.addSlide();
  s4.background = { color: theme.coverBg };

  // Decorative circle bottom-left
  s4.addShape("ellipse", {
    x: -2, y: 2.5, w: 5, h: 5,
    fill: { color: theme.coverFg, transparency: 94 },
    line: { color: theme.coverFg, transparency: 85, width: 0.5 },
  });

  const hasBrands = brands.length > 0;

  if (hasBrands) {
    s4.addText("PAST COLLABORATIONS", {
      x: MARGIN, y: 0.42, w: CW, h: 0.28,
      fontSize: 9, fontFace: "Calibri", bold: true,
      color: theme.coverMuted, charSpacing: 4, margin: 0,
    });

    // Brand pills — up to 12
    const pillW = 2.6, pillH = 0.5, pillGap = 0.25, rowGap = 0.22;
    const cols = 3;
    brands.slice(0, 12).forEach((brand, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = MARGIN + col * (pillW + pillGap);
      const y = 0.92 + row * (pillH + rowGap);
      s4.addShape("roundRect", {
        x, y, w: pillW, h: pillH,
        fill: { color: theme.coverFg, transparency: 88 },
        line: { color: theme.coverFg, transparency: 78, width: 0.5 },
        rectRadius: 0.06,
      });
      const bName = (brand.name ?? "Brand").slice(0, 22);
      s4.addText(bName, {
        x, y: y + 0.11, w: pillW, h: 0.28,
        fontSize: 11, fontFace: "Calibri", bold: true,
        color: theme.coverFg, align: "center", margin: 0,
      });
    });
  }

  // CTA block (bottom half if brands, centered if no brands)
  const ctaY = hasBrands ? 3.0 : 1.5;
  s4.addText("Let's create something together.", {
    x: MARGIN, y: ctaY, w: CW, h: 0.65,
    fontSize: hasBrands ? 22 : 34, fontFace: "Cambria", bold: true,
    color: theme.coverFg, align: hasBrands ? "left" : "center", margin: 0,
  });
  s4.addText(kitUrl, {
    x: MARGIN, y: ctaY + 0.72, w: CW * 0.75, h: 0.3,
    fontSize: 11, fontFace: "Calibri", color: theme.coverMuted,
    align: hasBrands ? "left" : "center", margin: 0,
    hyperlink: { url: kitUrl },
  });

  // Powered by
  s4.addText(`Created with Kitevo · ${APP_HOST}`, {
    x: MARGIN, y: H - 0.4, w: CW, h: 0.25,
    fontSize: 8, fontFace: "Calibri", color: theme.coverMuted,
    align: "right", margin: 0,
  });

  // ─── Write to buffer ──────────────────────────────────────────────────
  const buffer = await pres.write({ outputType: "nodebuffer" }) as Buffer;
  const safeSlug = (username || kit.slug).replace(/[^a-z0-9-]/gi, "-");
  const filename = `${safeSlug}-media-kit.pptx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
