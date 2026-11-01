import Link from "next/link";
import { adminCard, adminEyebrow, fmtDateTime } from "./AdminFrame";

export type AuditRow = {
  id: string;
  actor: string;
  action: string;
  targetUserId: string | null;
  targetEmail?: string | null;
  details: string | null;
  createdAt: Date;
};

/** Compact "field: before → after" summary of an audit row's details JSON. */
function summarize(details: string | null): string {
  if (!details) return "";
  try {
    const d = JSON.parse(details) as { before?: Record<string, unknown>; after?: Record<string, unknown>; result?: { status?: string } };
    if (d.before && d.after) {
      const keys = Object.keys(d.after).filter((k) => JSON.stringify(d.before?.[k]) !== JSON.stringify(d.after?.[k]));
      return keys.length
        ? keys.map((k) => `${k}: ${String(d.before?.[k] ?? "—")} → ${String(d.after?.[k] ?? "—")}`).join(" · ")
        : "no change";
    }
    if (d.result?.status) return `result: ${d.result.status}`;
    return details;
  } catch {
    return details;
  }
}

export function AuditTable({ rows, title = "Audit log" }: { rows: AuditRow[]; title?: string }) {
  return (
    <section className={`${adminCard} mt-6 p-5`}>
      <h2 className={adminEyebrow}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No admin changes yet.</p>
      ) : (
        <ul className="divide-border mt-3 divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="text-muted-foreground w-32 shrink-0 text-xs tabular-nums">{fmtDateTime(r.createdAt)}</span>
              <span className="font-mono text-xs">{r.action}</span>
              {r.targetUserId && (
                <Link href={`/admin/users/${r.targetUserId}`} className="text-xs underline underline-offset-2">
                  {r.targetEmail ?? r.targetUserId}
                </Link>
              )}
              <span className="text-muted-foreground min-w-0 flex-1 break-words text-xs">{summarize(r.details)}</span>
              <span className="text-muted-foreground text-xs">by {r.actor}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
