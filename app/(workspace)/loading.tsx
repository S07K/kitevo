import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";
import { PageHeaderSkeleton, PanelSkeleton, Skeleton } from "@/app/components/Skeleton";

/**
 * Shown inside the persistent frame while a tab's server render is in flight, so a click
 * gives instant feedback and the sidebar never blinks. Shaped like the common workspace
 * page: header, main column, right rail.
 */
export default function WorkspaceLoading() {
  return (
    <WorkspaceShell width="wide">
      <div role="status" aria-label="Loading">
        <PageHeaderSkeleton />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="min-w-0 space-y-6">
            <PanelSkeleton rows={2} />
            <PanelSkeleton rows={1} row="button" />
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
