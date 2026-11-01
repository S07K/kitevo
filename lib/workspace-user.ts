import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's id + account type, for workspace routes that render a different
 * view per role (/campaigns, /messages, /settings). Redirects to login otherwise.
 */
export async function requireWorkspaceUser(path: string): Promise<{ id: string; accountType: "creator" | "brand" }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  return { id: user.id, accountType: user.accountType === "brand" ? "brand" : "creator" };
}
