/**
 * The kit's headline: one plain-English paragraph built ONLY from data the kit really has.
 * Each clause is dropped when its data is missing, and self-reported numbers are worded as
 * the creator's own claim ("Alex reports …"), never as measured.
 * Client-safe, no imports.
 */

export type SummarySegment = { text: string; strong?: boolean };

export type SummaryInput = {
  name: string;
  instagram?: { followers: number; engagement?: number } | null;
  youtube?: { subscribers: number; avgViews?: number | null } | null;
  /** True when headline numbers are self-reported (manual stats). */
  selfReported?: boolean;
  gender?: { gender: string; pct: number }[];
  age?: { age: string; pct: number }[];
  countries?: { country: string; pct: number }[];
};

/** Same rounding as the stat strip's compact numbers (one decimal), so the sentence and the numbers never disagree. */
export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const THE = /^(United |Netherlands$|Philippines$|Czech Republic$|Dominican Republic$|Bahamas$|Gambia$|Maldives$)/;
const withArticle = (country: string) => (THE.test(country) ? `the ${country}` : country);

/** First word of the name, for "people follow Alex". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function audienceSummary(input: SummaryInput): SummarySegment[][] {
  const who = firstName(input.name);
  const ig = input.instagram && input.instagram.followers > 0 ? input.instagram : null;
  const yt = input.youtube && input.youtube.subscribers > 0 ? input.youtube : null;
  const sentences: SummarySegment[][] = [];

  // 1. Reach
  if (ig || yt) {
    if (input.selfReported) {
      const parts: SummarySegment[] = [{ text: `${who} reports ` }];
      if (ig) parts.push({ text: compactNumber(ig.followers), strong: true }, { text: " followers on Instagram" });
      if (ig && yt) parts.push({ text: " and " });
      if (yt) parts.push({ text: compactNumber(yt.subscribers), strong: true }, { text: " subscribers on YouTube" });
      parts.push({ text: "." });
      sentences.push(parts);
    } else if (ig && yt) {
      sentences.push([
        { text: compactNumber(ig.followers + yt.subscribers), strong: true },
        { text: ` people follow ${who} across Instagram and YouTube.` },
      ]);
    } else if (ig) {
      sentences.push([{ text: compactNumber(ig.followers), strong: true }, { text: ` people follow ${who} on Instagram.` }]);
    } else if (yt) {
      sentences.push([{ text: compactNumber(yt.subscribers), strong: true }, { text: ` people subscribe to ${who} on YouTube.` }]);
    }
  }

  // 2. Who they are (only measured audience data; manual stats never have it)
  const topGender = [...(input.gender ?? [])].sort((a, b) => b.pct - a.pct)[0];
  const topAge = [...(input.age ?? [])].sort((a, b) => b.pct - a.pct)[0];
  const topCountry = [...(input.countries ?? [])].sort((a, b) => b.pct - a.pct)[0];
  const clauses: SummarySegment[][] = [];
  if (topGender && topGender.pct >= 55) clauses.push([{ text: `${Math.round(topGender.pct)}% ${topGender.gender.toLowerCase()}`, strong: true }]);
  if (topAge) clauses.push([{ text: "most often aged " }, { text: topAge.age.replace(/-/g, "–"), strong: true }]);
  if (topCountry) clauses.push([{ text: "largest in " }, { text: withArticle(topCountry.country), strong: true }]);
  if (!input.selfReported && clauses.length) {
    const s: SummarySegment[] = [{ text: "The audience is " }];
    clauses.forEach((c, i) => {
      if (i > 0) s.push({ text: i === clauses.length - 1 ? (clauses.length > 2 ? ", and " : " and ") : ", " });
      s.push(...c);
    });
    s.push({ text: "." });
    sentences.push(s);
  }

  // 3. Typical performance
  if (!input.selfReported) {
    if (ig?.engagement && ig.engagement > 0) {
      sentences.push([{ text: "A typical post gets " }, { text: `${ig.engagement.toFixed(1)}%`, strong: true }, { text: " engagement." }]);
    } else if (yt?.avgViews && yt.avgViews > 0) {
      sentences.push([{ text: "A typical video gets " }, { text: compactNumber(yt.avgViews), strong: true }, { text: " views." }]);
    }
  }
  return sentences;
}
