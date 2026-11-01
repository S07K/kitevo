type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "open" | "closed";

const styles: Record<BadgeVariant, string> = {
  default:  "bg-muted text-muted-foreground",
  accent:   "bg-primary-soft text-primary-soft-foreground",
  success:  "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
  warning:  "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  danger:   "bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400",
  open:     "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
  closed:   "bg-muted text-muted-foreground",
};

type Props = {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ variant = "default", dot = false, children, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[variant]} ${className}`}>
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          variant === "success" || variant === "open" ? "bg-green-500" :
          variant === "warning" ? "bg-amber-500" :
          variant === "danger" ? "bg-red-500" :
          variant === "accent" ? "bg-primary" :
          "bg-muted-foreground"
        }`} />
      )}
      {children}
    </span>
  );
}
