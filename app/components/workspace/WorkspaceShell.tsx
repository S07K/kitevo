import type { ReactNode } from "react";

/**
 * Workspace page building blocks. The frame (top bar + sidebar) lives in
 * app/(workspace)/layout.tsx and persists across tabs; each page renders <WorkspaceShell>
 * (just its content area, see WorkspaceMain.tsx) and starts with <PageHeader>.
 * PageHeader / Panel / SectionTitle / Eyebrow stay server-safe so server pages can use them.
 */
export { WorkspaceShell } from "./WorkspaceMain";

/** Page title block shared by every tab: eyebrow (section), serif title, one-line description, actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Section heading inside a page (below the serif H1). Sentence-case 14px semibold so
 * sections read as sections; the 11px uppercase eyebrow is reserved for the page eyebrow
 * and metric labels.
 */
export function SectionTitle({ children, as: Tag = "h2" }: { children: ReactNode; as?: "h2" | "h3" }) {
  return <Tag className="text-sm font-semibold tracking-tight text-foreground">{children}</Tag>;
}

/** 11px uppercase label: page eyebrow and metric-tile labels only. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${className}`}>{children}</p>;
}

/** Standard content card. */
export function Panel({
  title,
  action,
  children,
  className = "",
  bodyClassName = "p-5 sm:p-6",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-background ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
          {title && <SectionTitle>{title}</SectionTitle>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
