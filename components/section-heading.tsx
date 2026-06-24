import { InView } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
}: {
  label?: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
}): ReactNode {
  const centered = align === "center";

  return (
    <InView
      className={cn(
        "max-w-2xl",
        centered && "mx-auto flex flex-col items-center text-center"
      )}
    >
      {label && (
        <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.18em] uppercase">
          {label}
        </p>
      )}
      <h2 className="text-foreground text-[clamp(28px,4vw,48px)] leading-[1.08] font-medium tracking-tight text-balance">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-5 max-w-xl text-base leading-relaxed">
          {description}
        </p>
      )}
    </InView>
  );
}
