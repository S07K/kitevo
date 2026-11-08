import { requireWorkspaceUser } from "@/lib/workspace-user";
import { DealsList } from "./DealsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deals · Kitevo" };

/** Brand deals (creators and brands): agreed terms, payments and history in one place. */
export default async function DealsPage() {
  const { accountType } = await requireWorkspaceUser("/deals");
  return <DealsList isBrand={accountType === "brand"} />;
}
