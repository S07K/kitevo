"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/app/components/AppNav";
import { useInWorkspaceFrame, useInboxBadge } from "./WorkspaceFrame";

/**
 * width: "narrow" forms/settings (max-w-3xl) · "default" lists/feeds (max-w-5xl) ·
 *        "wide" dashboards (max-w-6xl) · "full" edge-to-edge tools like Messages.
 */
const WIDTH = { narrow: "max-w-3xl", default: "max-w-5xl", wide: "max-w-6xl", full: "" } as const;

/**
 * A workspace page's content area. The top bar + sidebar come from the persistent
 * WorkspaceFrame (app/(workspace)/layout.tsx), so this renders only <main>. Signed-out
 * visitors on public workspace routes (e.g. a shared campaign link) get no frame; for them
 * this adds the top bar itself.
 *
 * `variant` is accepted for compatibility and ignored: the frame knows the viewer's role.
 */
export function WorkspaceShell({
  inboxBadge,
  width = "default",
  children,
}: {
  variant?: "creator" | "brand";
  inboxBadge?: number;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  const inFrame = useInWorkspaceFrame();
  useInboxBadge(inboxBadge);

  const main =
    width === "full" ? (
      <main className="pt-[57px]">{children}</main>
    ) : (
      <main className={`mx-auto ${WIDTH[width]} px-5 pb-28 pt-[89px] sm:px-8 md:pb-16 lg:px-10`}>{children}</main>
    );

  if (inFrame) return main;
  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav />
      {main}
    </div>
  );
}
