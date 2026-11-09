import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kitevoAiTarget } from "@/lib/ai/client";
import { AI_PROVIDER_INFO, isAiProvider } from "@/lib/ai/providers";
import { monthlyLimit } from "@/lib/copilot";
import { adminCard, adminEyebrow } from "./AdminFrame";

const TASK_LABEL: Record<string, string> = { bio: "Bios", pitch: "Pitches", inquiry_reply: "Inquiry replies", message: "Message drafts" };

/**
 * Copilot at a glance: drafts in the last 30 days by task and by whose key, how many creators
 * use it, own-key connections by provider, and who is closest to the monthly cap on Kitevo's
 * key (what Kitevo pays for). Counts only; prompts and drafts are never stored.
 */
export async function CopilotUsage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [byTask, users, connections, heavy] = await Promise.all([
    prisma.copilotUsage.groupBy({ by: ["task", "source"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.copilotUsage.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
    prisma.aiConnection.groupBy({ by: ["provider"], _count: { _all: true } }),
    prisma.copilotUsage.groupBy({
      by: ["userId"],
      where: { source: "kitevo", createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
  ]);
  const emails = new Map(
    (await prisma.user.findMany({ where: { id: { in: heavy.map((h) => h.userId) } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]),
  );

  const total = byTask.reduce((a, r) => a + r._count._all, 0);
  const onKitevo = byTask.filter((r) => r.source === "kitevo").reduce((a, r) => a + r._count._all, 0);
  const tasks = new Map<string, number>();
  for (const r of byTask) tasks.set(r.task, (tasks.get(r.task) ?? 0) + r._count._all);
  const target = kitevoAiTarget();
  const limit = monthlyLimit();

  return (
    <section className={`${adminCard} mt-6 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={adminEyebrow}>Copilot · last 30 days</h2>
        <span className="text-xs text-muted-foreground">
          Kitevo&apos;s AI: {target ? `${target.provider} · ${target.model} · ${limit}/creator/month (Pro)` : "not configured (own keys only)"}
        </span>
      </div>
      {total === 0 && connections.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No Copilot drafts yet.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Drafts</dt><dd className="font-semibold tabular-nums">{total}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">On Kitevo&apos;s key</dt><dd className="tabular-nums">{onKitevo}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">On creators&apos; keys</dt><dd className="tabular-nums">{total - onKitevo}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Creators using it</dt><dd className="tabular-nums">{users.length}</dd></div>
          </dl>
          <div>
            <p className="text-xs text-muted-foreground">By draft</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {[...tasks].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <li key={t} className="flex justify-between gap-3"><span>{TASK_LABEL[t] ?? t}</span><span className="tabular-nums">{n}</span></li>
              ))}
              {tasks.size === 0 && <li className="text-muted-foreground">—</li>}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Own AI keys connected</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {connections.map((c) => (
                <li key={c.provider} className="flex justify-between gap-3">
                  <span>{isAiProvider(c.provider) ? AI_PROVIDER_INFO[c.provider].name : c.provider}</span>
                  <span className="tabular-nums">{c._count._all}</span>
                </li>
              ))}
              {connections.length === 0 && <li className="text-muted-foreground">None</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Most drafts on Kitevo&apos;s key this month</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {heavy.map((h) => (
                <li key={h.userId} className="flex justify-between gap-3">
                  <Link href={`/admin/users/${h.userId}`} className="min-w-0 truncate underline-offset-2 hover:underline">{emails.get(h.userId) ?? h.userId}</Link>
                  <span className={`shrink-0 tabular-nums ${h._count._all >= limit ? "font-semibold text-amber-700 dark:text-amber-400" : ""}`}>
                    {h._count._all}/{limit}
                  </span>
                </li>
              ))}
              {heavy.length === 0 && <li className="text-muted-foreground">—</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
