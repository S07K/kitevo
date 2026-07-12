"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Avatar image that falls back to `fallback` (usually initials) when there is no
 * src or the image fails to load. Guards against expired/broken avatar URLs — e.g.
 * signed Instagram CDN links — rendering a broken-image icon.
 */
export function AvatarImg({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (!src || broken) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt ?? ""}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
