import * as React from "react";
import { cn } from "../../lib/cn";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-lg border border-border/55 bg-[rgb(var(--input-bg)/0.96)] px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/55 focus:bg-[rgb(var(--input-bg-focus)/0.98)] focus-visible:ring-1 focus-visible:ring-accent/40",
        className,
      )}
      {...props}
    />
  );
});
