"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  name: string | null;
  avatarUrl: string | null;
  accountType: string;
};

export function NavAvatar() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setProfile({ name: d.name, avatarUrl: d.avatarUrl, accountType: d.accountType }))
      .catch(() => {});
  }, []);

  if (!profile) return null;

  const href = profile.accountType === "brand" ? "/brand/settings" : "/profile";
  const initials = (profile.name ?? "?").charAt(0).toUpperCase();

  return (
    <Link
      href={href}
      className="h-8 w-8 rounded-full overflow-hidden border border-border bg-muted hover:opacity-80 transition-opacity shrink-0 flex items-center justify-center"
      title="Profile settings"
    >
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={profile.name ?? ""} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-xs font-semibold text-foreground">{initials}</span>
      )}
    </Link>
  );
}
