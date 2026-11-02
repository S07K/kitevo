import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * The workspace button. One shape (pill), three sizes, four variants, so every page uses
 * the same heights and hovers. Keep `primary` (solid brand indigo) to one action per area; use
 * `secondary` for the rest.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-[opacity,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover",
  secondary: "border border-border text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-red-600 text-white hover:opacity-85",
  "danger-outline":
    "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30",
};

export function buttonClass({
  variant = "secondary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode };

export function Button({ variant, size, className, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...rest} />;
}

/** Square icon-only button. `label` is required: it is the accessible name. */
export function IconButton({
  label,
  className = "",
  type = "button",
  children,
  ...rest
}: { label: string; children: ReactNode } & Omit<ComponentProps<"button">, "aria-label">) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
