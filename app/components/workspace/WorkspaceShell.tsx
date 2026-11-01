import type { ReactNode } from "react";
import { AppNav } from "@/app/components/AppNav";
import { WorkspaceSidebar } from "@/app/components/WorkspaceSidebar";

/**
 * The frame every workspace tab renders in: top bar, sidebar, one canvas colour, one
 * content width scale and one vertical rhythm. Pages supply only their content (usually
 * starting with <PageHeader>), so moving between tabs feels like one app.
 *
 * width: "narrow" forms/settings (max-w-3xl) · "default" lists/feeds (max-w-5xl) ·
 *        "wide" dashboards (max-w-6xl) · "full" edge-to-edge tools like Messages.
 */
const WIDTH = { narrow: "max-w-3xl", default: "max-w-5xl", wide: "max-w-6xl", full: "" } as const;

export function WorkspaceShell({
  variant,
  inboxBadge,
  width = "default",
  children,
}: {
  variant?: "creator" | "brand";
  inboxBadge?: number;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <AppNav avatarOnMobileOnly />
      <WorkspaceSidebar variant={variant} inboxBadge={inboxBadge} />
      <div className="md:pl-56">
        {width === "full" ? (
          <main className="pt-[57px]">{children}</main>
        ) : (
          <main className={`mx-auto ${WIDTH[width]} px-5 pb-28 pt-[89px] sm:px-8 md:pb-16 lg:px-10`}>{children}</main>
        )}
      </div>
    </div>
  );
}

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
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary dark:text-primary-soft-foreground">{eyebrow}</p>}
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
    <section className={`overflow-hidden rounded-2xl border border-border bg-background shadow-[0_1px_2px_rgba(28,25,20,0.04)] ${className}`}>
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
