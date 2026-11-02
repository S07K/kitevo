"use client";

import { useEffect } from "react";
import { REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/referral-cookie";

/**
 * Remembers `?ref=CODE` from any landing URL in a first-party cookie, so signup (email
 * or Google, possibly days later) can credit the referrer. First touch wins: an existing
 * referral cookie is never overwritten by a later link.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
      if (!code || !/^[a-z0-9]{4,32}$/.test(code)) return;
      if (document.cookie.split("; ").some((c) => c.startsWith(`${REF_COOKIE}=`))) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${REF_COOKIE}=${code}; Max-Age=${REF_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    } catch {
      /* cookies blocked — referral just isn't credited */
    }
  }, []);
  return null;
}
