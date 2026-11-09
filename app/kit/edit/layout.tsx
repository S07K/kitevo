import type { ReactNode } from "react";
import { getWorkspaceViewer } from "@/lib/workspace-user";
import { WorkspaceFrame } from "@/app/components/workspace/WorkspaceFrame";
import { SuspendedScreen } from "@/app/components/SuspendedScreen";
import { SUSPENDED_MESSAGE } from "@/lib/safety";

/**
 * The kit editor lives at /kit/edit (next to the public /kit/[username] pages), so it can't
 * sit in the app/(workspace) route group. It gets the same frame: top bar + sidebar.
 * Signed-out visitors never reach here (middleware sends /kit/edit to /login).
 */
export default async function KitEditLayout({ children }: { children: ReactNode }) {
  const viewer = await getWorkspaceViewer();
  if (!viewer) return <>{children}</>;
  if (viewer.suspended) return <SuspendedScreen message={SUSPENDED_MESSAGE} />;
  return (
    <WorkspaceFrame
      viewer={{ accountType: viewer.accountType, name: viewer.name, email: viewer.email, avatarUrl: viewer.avatarUrl, isAdmin: viewer.isAdmin }}
    >
      {children}
    </WorkspaceFrame>
  );
}
