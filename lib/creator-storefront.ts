import { prisma } from "@/lib/prisma";
import { DEFAULT_KIT_APPEARANCE, parseKitAppearance, type KitAppearance } from "@/lib/kit-appearance";

/** The seller as a product/delivery page shows them, styled like their main kit. */
export async function storefrontSeller(userId: string): Promise<{
  name: string;
  username: string | null;
  avatarUrl: string | null;
  kitSlug: string | null;
  appearance: KitAppearance;
}> {
  const [user, kit] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, avatarUrl: true } }),
    prisma.kit.findFirst({ where: { userId, passwordHash: null }, orderBy: { createdAt: "asc" }, select: { slug: true, appearance: true } }),
  ]);
  return {
    name: user?.name || user?.username || "Creator",
    username: user?.username ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    kitSlug: kit?.slug ?? null,
    appearance: kit ? parseKitAppearance(kit.appearance) : DEFAULT_KIT_APPEARANCE,
  };
}
