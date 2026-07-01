import { cn } from "@/lib/utils";

type Props = {
  tier: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const TIERS = {
  creator_pro: {
    label: "Verified Creator",
    title: "Verified Pro Creator",
    // blue tick
    color: "#1d9bf0",
  },
  top_creator: {
    label: "Top Creator",
    title: "Top Creator — Kitevo Select",
    // gold tick
    color: "#f4c430",
  },
  brand_verified: {
    label: "Verified Brand",
    title: "Verified Brand",
    // purple tick
    color: "#7c3aed",
  },
} as const;

const SIZE = { sm: 14, md: 18, lg: 22 };

export function VerifiedBadge({ tier, size = "md", className }: Props) {
  if (!tier) return null;
  const def = TIERS[tier as keyof typeof TIERS];
  if (!def) return null;
  const px = SIZE[size];

  return (
    <span title={def.title} aria-label={def.label} className={cn("inline-flex shrink-0", className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden
      >
        {/* Badge shield */}
        <path
          d="M11 2L3 5.5V11c0 4.418 3.358 8.55 8 9.938C15.642 19.55 19 15.418 19 11V5.5L11 2Z"
          fill={def.color}
        />
        {/* Tick */}
        <path
          d="M7.5 11.5l2.5 2.5 5-5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
