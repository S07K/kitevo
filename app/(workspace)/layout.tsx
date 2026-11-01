import type { ReactNode } from "react";
import { getWorkspaceViewer } from "@/lib/workspace-user";
import { WorkspaceFrame } from "@/app/components/workspace/WorkspaceFrame";

/**
 * One layout for every workspace tab (/dashboard, /discover, /campaigns, /messages,
 * /referrals, /settings, /pricing, /admin). Layouts stay mounted on client navigation, so the
 * top bar and sidebar render once; a tab click re-renders only the page.
 *
 * Signed-out visitors (public /pricing, shared /campaigns/[id] links) get no frame: those
 * pages render their own public chrome. Private routes are already sent to /login by
 * middleware before reaching here.
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const viewer = await getWorkspaceViewer();
  if (!viewer) return <>{children}</>;
  return (
    <WorkspaceFrame
      viewer={{
        accountType: viewer.accountType,
        name: viewer.name,
        email: viewer.email,
        avatarUrl: viewer.avatarUrl,
        isAdmin: viewer.isAdmin,
      }}
    >
      {children}
    </WorkspaceFrame>
  );
}
