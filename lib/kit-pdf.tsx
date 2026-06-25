import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { WorkSample, KitRates, BrandPartner } from "./mock-data";
import type { PdfTheme } from "./pdf-theme";

// Register clean system fonts (no external fetch needed at build time)
Font.register({
  family: "Georgia",
  src: "https://fonts.gstatic.com/s/cormorantgaramond/v22/BXRlvF3Pi-DLmw0iBMkMHBmVGl5O.woff2",
});

function makeStyles(t: PdfTheme) {
  return StyleSheet.create({
    page: {
      backgroundColor: t.bg,
      paddingTop: 56,
      paddingBottom: 56,
      paddingHorizontal: 52,
      fontFamily: "Helvetica",
      color: t.text,
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      paddingBottom: 24,
      marginBottom: 32,
    },
    headerLeft: { flex: 1 },
    name: {
      fontSize: 28,
      fontFamily: "Helvetica-Bold",
      color: t.text,
      letterSpacing: -0.5,
    },
    handle: {
      fontSize: 11,
      color: t.textMuted,
      marginTop: 4,
      letterSpacing: 0.2,
    },
    bio: {
      fontSize: 10,
      color: t.textMuted,
      marginTop: 8,
      lineHeight: 1.5,
      maxWidth: 320,
    },
    badge: {
      backgroundColor: t.accent,
      color: t.bg,
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: "flex-start",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    kitName: {
      fontSize: 10,
      color: t.textMuted,
      textAlign: "right",
      marginBottom: 4,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    url: {
      fontSize: 9,
      color: t.textMuted,
      textAlign: "right",
    },

    // ── Section ─────────────────────────────────────────────────────────────
    section: { marginBottom: 28 },
    sectionLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: t.textMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: t.border,
      paddingBottom: 6,
    },

    // ── Stats grid ──────────────────────────────────────────────────────────
    statsRow: { flexDirection: "row", gap: 12 },
    statCard: {
      flex: 1,
      backgroundColor: t.surface,
      borderRadius: 10,
      padding: 14,
      borderWidth: 0.5,
      borderColor: t.border,
    },
    statValue: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: t.text,
      letterSpacing: -0.3,
    },
    statLabel: {
      fontSize: 9,
      color: t.textMuted,
      marginTop: 3,
    },
    statSub: {
      fontSize: 9,
      color: t.accent,
      marginTop: 6,
      fontFamily: "Helvetica-Bold",
    },

    // ── Work samples ────────────────────────────────────────────────────────
    samplesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    sampleCard: {
      width: "31%",
      backgroundColor: t.surface,
      borderRadius: 8,
      padding: 10,
      borderWidth: 0.5,
      borderColor: t.border,
    },
    samplePlatform: {
      fontSize: 7,
      color: t.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    sampleTitle: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: t.text,
      lineHeight: 1.4,
    },
    sampleFor: {
      fontSize: 8,
      color: t.textMuted,
      marginTop: 3,
    },
    sampleCaption: {
      fontSize: 8,
      color: t.textMuted,
      marginTop: 4,
      lineHeight: 1.4,
    },

    // ── Brands ──────────────────────────────────────────────────────────────
    brandsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    brandChip: {
      backgroundColor: t.surface,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 0.5,
      borderColor: t.border,
    },
    brandName: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: t.text,
    },
    brandTagline: {
      fontSize: 8,
      color: t.textMuted,
      marginTop: 1,
    },

    // ── Rates CTA ───────────────────────────────────────────────────────────
    ratesBlock: {
      backgroundColor: t.accent,
      borderRadius: 12,
      padding: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratesAmount: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: t.bg,
    },
    ratesLabel: {
      fontSize: 9,
      color: t.bg,
      opacity: 0.7,
      marginTop: 2,
    },
    ratesCta: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: t.bg,
      backgroundColor: t.text === t.bg ? t.textMuted : t.text,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },

    // ── Links ───────────────────────────────────────────────────────────────
    linkRow: {
      backgroundColor: t.surface,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 0.5,
      borderColor: t.border,
      marginBottom: 6,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    linkLabel: { fontSize: 10, color: t.text, fontFamily: "Helvetica-Bold" },
    linkUrl: { fontSize: 8, color: t.textMuted },

    // ── Footer ──────────────────────────────────────────────────────────────
    footer: {
      position: "absolute",
      bottom: 28,
      left: 52,
      right: 52,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 0.5,
      borderTopColor: t.border,
      paddingTop: 10,
    },
    footerText: { fontSize: 8, color: t.textMuted },
  });
}

interface KitPdfProps {
  creator: { name: string; username: string; bio?: string };
  kitName: string;
  appUrl: string;
  workSamples: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  links: { label: string; url: string }[];
  stats?: {
    followers: number;
    avgEngagement: number;
    growthThisMonth: number;
    platform: string;
  } | null;
  theme: PdfTheme;
  sectionVisibility: Record<string, boolean>;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function KitPdf({
  creator,
  kitName,
  appUrl,
  workSamples,
  rates,
  brands,
  links,
  stats,
  theme: t,
  sectionVisibility,
}: KitPdfProps) {
  const s = makeStyles(t);
  const publicUrl = `${appUrl}/kit/${creator.username}`;

  return (
    <Document
      title={`${creator.name} — Media Kit`}
      author={creator.name}
      creator="Media Kit Pro"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.name}>{creator.name}</Text>
            {creator.username && (
              <Text style={s.handle}>@{creator.username}</Text>
            )}
            {creator.bio && <Text style={s.bio}>{creator.bio}</Text>}
          </View>
          <View>
            <Text style={s.kitName}>{kitName}</Text>
            <Text style={s.url}>{publicUrl}</Text>
          </View>
        </View>

        {/* Stats */}
        {sectionVisibility.stats && stats && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Reach & Engagement</Text>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{fmt(stats.followers)}</Text>
                <Text style={s.statLabel}>
                  {stats.platform.charAt(0).toUpperCase() + stats.platform.slice(1)} followers
                </Text>
                <Text style={s.statSub}>+{stats.growthThisMonth}% this month</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{stats.avgEngagement}%</Text>
                <Text style={s.statLabel}>Average engagement rate</Text>
                <Text style={s.statSub}>Per post</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>
                  {stats.avgEngagement > 0
                    ? fmt(Math.round(stats.followers * (stats.avgEngagement / 100)))
                    : "—"}
                </Text>
                <Text style={s.statLabel}>Avg. interactions / post</Text>
                <Text style={s.statSub}>Likes + comments</Text>
              </View>
            </View>
          </View>
        )}

        {/* Work samples */}
        {sectionVisibility.workSamples && workSamples.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Work Samples</Text>
            <View style={s.samplesGrid}>
              {workSamples.slice(0, 6).map((sample, i) => (
                <View key={i} style={s.sampleCard}>
                  <Text style={s.samplePlatform}>{sample.platform}</Text>
                  <Text style={s.sampleTitle}>{sample.title ?? "Campaign"}</Text>
                  {sample.campaignFor && (
                    <Text style={s.sampleFor}>{sample.campaignFor}</Text>
                  )}
                  {sample.caption && (
                    <Text style={s.sampleCaption}>{sample.caption}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Brands */}
        {sectionVisibility.brands && brands.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Brands I've Worked With</Text>
            <View style={s.brandsRow}>
              {brands.map((brand, i) => (
                <View key={i} style={s.brandChip}>
                  <Text style={s.brandName}>{brand.name}</Text>
                  {brand.tagline && (
                    <Text style={s.brandTagline}>{brand.tagline}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rates */}
        {sectionVisibility.rates && rates.show && (
          <View style={[s.section, { marginTop: 4 }]}>
            <Text style={s.sectionLabel}>Rates</Text>
            <View style={s.ratesBlock}>
              <View>
                <Text style={s.ratesAmount}>
                  {rates.fromAmount != null
                    ? `From $${rates.fromAmount.toLocaleString()}`
                    : "Contact for rates"}
                </Text>
                <Text style={s.ratesLabel}>Per collaboration</Text>
              </View>
              {rates.ctaLabel && (
                <Text style={s.ratesCta}>{rates.ctaLabel}</Text>
              )}
            </View>
          </View>
        )}

        {/* Links */}
        {sectionVisibility.links && links.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Get in Touch</Text>
            {links.map((link, i) => (
              <View key={i} style={s.linkRow}>
                <Text style={s.linkLabel}>{link.label}</Text>
                <Text style={s.linkUrl}>{link.url}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {creator.name} · Media Kit · {new Date().getFullYear()}
          </Text>
          <Text style={s.footerText}>mediakit.pro</Text>
        </View>
      </Page>
    </Document>
  );
}
