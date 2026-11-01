import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { PipelineView } from "./PipelineView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline · Kitevo" };

/** Creator deal pipeline: brand inquiries from the kit contact form. Brands have no pipeline. */
export default async function PipelinePage() {
  const { accountType } = await requireWorkspaceUser("/pipeline");
  if (accountType === "brand") redirect("/discover");
  return <PipelineView />;
}
