import * as React from "react";

import { cn } from "~/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "block w-full rounded-(--radius-md) bg-card text-sm leading-relaxed",
          "border border-border px-3.5 py-2.5",
          "text-foreground placeholder:text-(--color-text-faint)",
          "transition-[border-color,box-shadow,background-color]",
          "duration-(--duration-fast) ease-(--ease-out-expo)",
          "outline-none focus:border-accent focus:ring-accent-soft",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
          "resize-y",
          className,
        )}
        {...props}
      />
    );
  },
);
