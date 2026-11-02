import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

export type WorkspaceViewer = {
  id: string;
  accountType: "creator" | "brand";
  /** Display name: company name for brands, personal name for creators. */
  name: string | null;
  email: string | null;
  /** Brand logo for brands, avatar for creators. */
  avatarUrl: string | null;
  isAdmin: boolean;
};

/**
 * The signed-in viewer, or null. Wrapped in React `cache` so the workspace layout and the
 * page it wraps share one session + DB lookup per request.
 */
export const getWorkspaceViewer = cache(async (): Promise<WorkspaceViewer | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      accountType: true,
      name: true,
      email: true,
      avatarUrl: true,
      brandProfile: { select: { companyName: true, logoUrl: true } },
    },
  });
  if (!user) return null;
  const brand = user.accountType === "brand";
  return {
    id: user.id,
    accountType: brand ? "brand" : "creator",
    name: (brand ? user.brandProfile?.companyName : null) ?? user.name,
    email: user.email,
    avatarUrl: (brand ? user.brandProfile?.logoUrl : null) ?? user.avatarUrl,
    isAdmin: isAdminEmail(user.email),
  };
});

/**
 * The signed-in user's id + account type, for workspace routes that render a different
 * view per role (/campaigns, /messages, /settings). Redirects to login otherwise.
 */
export async function requireWorkspaceUser(path: string): Promise<{ id: string; accountType: "creator" | "brand" }> {
  const viewer = await getWorkspaceViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  return { id: viewer.id, accountType: viewer.accountType };
}
