import * as React from "react";

import { cn } from "~/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.16em]",
        "text-(--color-text-muted)",
        className,
      )}
      {...props}
    />
  );
});
