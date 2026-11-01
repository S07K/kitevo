import { requireWorkspaceUser } from "@/lib/workspace-user";
import BrandCampaigns from "./BrandCampaigns";
import CreatorCampaigns from "./CreatorCampaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns · Kitevo" };

/** Campaigns tab: creators browse open briefs; brands manage their own campaigns. */
export default async function CampaignsPage() {
  const { accountType } = await requireWorkspaceUser("/campaigns");
  return accountType === "brand" ? <BrandCampaigns /> : <CreatorCampaigns />;
}
