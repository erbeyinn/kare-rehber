import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-full font-medium",
    "transition-colors duration-(--duration-fast) ease-(--ease-out-expo)",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-(--shadow-soft) hover:bg-primary/92",
        accent:
          "bg-accent text-accent-foreground shadow-(--shadow-soft) hover:bg-accent/92",
        secondary:
          "bg-secondary text-secondary-foreground shadow-(--shadow-soft) hover:bg-secondary/92",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted",
        ghost:
          "text-foreground hover:bg-muted",
        link:
          "text-primary underline-offset-4 hover:underline rounded-none",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 shadow-(--shadow-soft)",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = HTMLMotionProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, type, ...props }, ref) {
    return (
      <motion.button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        {...props}
      />
    );
  },
);

export { buttonVariants };
