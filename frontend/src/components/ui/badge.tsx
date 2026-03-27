import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/55 bg-[rgb(var(--surface-2)/0.72)] px-2.5 py-1 text-xs font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}
