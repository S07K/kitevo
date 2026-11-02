import { requireWorkspaceUser } from "@/lib/workspace-user";
import BrandInbox from "./BrandInbox";
import CreatorInbox from "./CreatorInbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages · Kitevo" };

/** Messages tab: one route for both roles. */
export default async function MessagesPage() {
  const { accountType } = await requireWorkspaceUser("/messages");
  return accountType === "brand" ? <BrandInbox /> : <CreatorInbox />;
}
