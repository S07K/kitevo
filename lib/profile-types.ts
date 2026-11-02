import type { ProfilePayload } from "@/app/api/me/profile/route";

/** What GET /api/me/profile returns (profile fields + account flags). */
export type AccountProfile = ProfilePayload & {
  email?: string;
  onboardingCompletedAt?: string | null;
  instagramConnected?: boolean;
  accountType?: string;
};
