import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin access = signed-in user whose email is listed in ADMIN_EMAILS (comma-separated).
 * Unset = nobody is an admin. Admin pages answer 404 (not 403) to everyone else, so they
 * don't advertise that they exist.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** The admin's { id, email }, or null for anyone else. Checks the DB email, not the JWT copy. */
export async function getAdmin(): Promise<{ id: string; email: string } | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  return user && isAdminEmail(user.email) ? user : null;
}
