/**
 * Report & block, client-safe half (labels and limits). Server rules live in lib/safety.ts.
 */

export const REPORT_REASONS = [
  { id: "scam", label: "Scam, or asking for payment outside Kitevo" },
  { id: "spam", label: "Spam or unwanted promotion" },
  { id: "harassment", label: "Harassment or abuse" },
  { id: "impersonation", label: "Fake brand or impersonation" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const MAX_REPORT_NOTE = 1000;

export function isReportReason(v: unknown): v is ReportReason {
  return typeof v === "string" && REPORT_REASONS.some((r) => r.id === v);
}

export function reasonLabel(id: string): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
}

/** Where a report came from: "conversation:<id>", "deal:<id>", "campaign:<id>", "application:<id>", "inquiry:<id>" or "profile". */
export function cleanReportContext(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return /^(profile|(conversation|deal|campaign|application|inquiry):[A-Za-z0-9_-]{1,64})$/.test(v) ? v : null;
}

/** The error a blocked action returns. Deliberately doesn't say who blocked whom. */
export const BLOCKED_MESSAGE = "You can't do this: one of you has blocked the other.";
