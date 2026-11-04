import { Globe } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import type { IntegrationLogo as LogoId } from "@/lib/integrations";


/** A brand mark on a neutral rounded tile. */
export function IntegrationLogo({ id, size = 44 }: { id: LogoId; size?: number }) {
  const icon = Math.round(size * 0.5);
  const tile = "inline-flex shrink-0 items-center justify-center rounded-[28%] border border-border bg-background";
  if (id === "domain") {
    return (
      <span className={`${tile} text-primary`} style={{ width: size, height: size }}>
        <Globe size={icon} aria-hidden />
      </span>
    );
  }
  return (
    <span className={tile} style={{ width: size, height: size }}>
      <BrandIcon brand={id} size={icon} />
    </span>
  );
}
