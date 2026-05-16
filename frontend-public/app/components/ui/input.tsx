import * as React from "react";

import { cn } from "~/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        className={cn(
          "block w-full rounded-(--radius-md) bg-card text-sm",
          "border border-border px-3.5 py-2.5",
          "text-foreground placeholder:text-(--color-text-faint)",
          "transition-[border-color,box-shadow,background-color]",
          "duration-(--duration-fast) ease-(--ease-out-expo)",
          "outline-none focus:border-accent focus:ring-accent-soft",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
          className,
        )}
        {...props}
      />
    );
  },
);
