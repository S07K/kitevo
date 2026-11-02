"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppNav } from "@/app/components/AppNav";
import { WorkspaceSidebar, type SidebarViewer } from "@/app/components/WorkspaceSidebar";

type FrameApi = { setInboxBadge: (n: number | undefined) => void };
const FrameContext = createContext<FrameApi | null>(null);

/**
 * The persistent chrome of the signed-in app: top bar + sidebar, rendered once by
 * app/(workspace)/layout.tsx. Next keeps layouts mounted across navigation, so clicking a tab
 * swaps only the page inside — the sidebar, its data and its state survive.
 */
export function WorkspaceFrame({ viewer, children }: { viewer: SidebarViewer; children: ReactNode }) {
  const [inboxBadge, setInboxBadge] = useState<number | undefined>(undefined);
  // Stable value: pages that only *set* the badge never re-render because of it.
  const api = useMemo<FrameApi>(() => ({ setInboxBadge }), []);
  const account = useMemo(
    () => ({ name: viewer.name, avatarUrl: viewer.avatarUrl, accountType: viewer.accountType }),
    [viewer.name, viewer.avatarUrl, viewer.accountType],
  );

  return (
    <FrameContext.Provider value={api}>
      <div className="min-h-screen bg-canvas">
        <AppNav avatarOnMobileOnly account={account} />
        <WorkspaceSidebar viewer={viewer} inboxBadge={inboxBadge} />
        <div className="md:pl-56">{children}</div>
      </div>
    </FrameContext.Provider>
  );
}

/** True when rendered inside the persistent frame (i.e. a signed-in viewer). */
export function useInWorkspaceFrame(): boolean {
  return useContext(FrameContext) !== null;
}

/** Let a page drive the sidebar's inbox badge while it's mounted (Messages). */
export function useInboxBadge(count: number | undefined) {
  const frame = useContext(FrameContext);
  useEffect(() => {
    if (frame && count !== undefined) frame.setInboxBadge(count);
  }, [frame, count]);
  useEffect(() => () => frame?.setInboxBadge(undefined), [frame]);
}
