import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { hasPaidCreatorPlan } from "@/lib/creator-plan";
import { ConnectorsView } from "./ConnectorsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connectors · Kitevo" };

/** Every account a creator connects, in one place: stats sources and payment accounts. */
export default async function ConnectorsPage() {
  const { id, accountType } = await requireWorkspaceUser("/connectors");
  if (accountType === "brand") redirect("/discover");
  return <ConnectorsView paidPlan={await hasPaidCreatorPlan(id)} />;
}
