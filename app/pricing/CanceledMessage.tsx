"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CanceledMessageInner() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";
  if (!canceled) return null;
  return (
    <div className="mb-8 p-4 rounded-sm bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      Checkout canceled. You can try again whenever you’re ready.
    </div>
  );
}

export function CanceledMessage() {
  return (
    <Suspense fallback={null}>
      <CanceledMessageInner />
    </Suspense>
  );
}
