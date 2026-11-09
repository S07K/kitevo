"use client";

import { signOut } from "next-auth/react";
import { AuthLayout } from "@/app/components/AuthLayout";
import { Button } from "@/app/components/workspace/Button";

/**
 * Shown instead of the workspace to a signed-in account that an admin suspended. Sessions are
 * JWTs, so sign-in being refused doesn't end a session that already exists; this does.
 */
export function SuspendedScreen({ message }: { message: string }) {
  return (
    <AuthLayout title="Account suspended" subtitle={message}>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">Your public kit, profile and campaigns are hidden while it&apos;s suspended.</p>
      <Button variant="primary" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
    </AuthLayout>
  );
}
