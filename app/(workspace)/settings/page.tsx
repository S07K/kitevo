import { requireWorkspaceUser } from "@/lib/workspace-user";
import BrandSettings from "./BrandSettings";
import CreatorSettings from "./CreatorSettings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Kitevo" };

/** Settings tab: profile + connections + plan for creators; company profile + plan for brands. */
export default async function SettingsPage() {
  const { accountType } = await requireWorkspaceUser("/settings");
  return accountType === "brand" ? <BrandSettings /> : <CreatorSettings />;
}
