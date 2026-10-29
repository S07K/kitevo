"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    TroopyChat?: { push: (command: [string, unknown]) => void } | Array<[string, unknown]>;
  }
}

export function TroopyIdentity() {
  const { data: session, status } = useSession();
  const user = session?.user as
    | { id?: string; email?: string | null; name?: string | null; image?: string | null }
    | undefined;

  useEffect(() => {
    if (status === "loading") return;
    if (!user?.id) {
      (window.TroopyChat = window.TroopyChat || []).push(["identify", null]);
      return;
    }

    let cancelled = false;
    fetch("/api/troopy/identity")
      .then((response) => (response.ok ? response.json() : null))
      .then((identity) => {
        if (cancelled || !identity) return;
        (window.TroopyChat = window.TroopyChat || []).push([
          "identify",
          {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.image,
            hash: identity.hash,
          },
        ]);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [status, user?.id, user?.email, user?.name, user?.image]);

  return null;
}
