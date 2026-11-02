import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Whether the signed-in user is an admin, so the sidebar can show the Admin link.
 * Answers only about the caller ({ admin: false } for everyone else, signed in or not);
 * the /admin pages themselves still 404 for non-admins.
 */
export async function GET() {
  const admin = await getAdmin();
  return NextResponse.json({ admin: !!admin }, { headers: { "Cache-Control": "private, no-store" } });
}
