import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-full font-medium",
    "px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
    "transition-colors duration-(--duration-fast) ease-(--ease-out-expo)",
  ].join(" "),
  {
    variants: {
      tone: {
        neutral:
          "bg-muted text-(--color-text-muted)",
        primary:
          "bg-primary/10 text-primary",
        accent:
          "bg-accent/12 text-accent",
        secondary:
          "bg-secondary/12 text-secondary",
        success:
          "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        warning:
          "bg-amber-500/14 text-amber-800 dark:text-amber-300",
        danger:
          "bg-destructive/12 text-destructive",
        outline:
          "border border-border bg-transparent text-(--color-text-muted)",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, tone, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ tone }), className)}
        {...props}
      />
    );
  },
);

export { badgeVariants };
