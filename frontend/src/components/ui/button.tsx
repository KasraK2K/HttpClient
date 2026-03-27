import * as React from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "default" | "secondary" | "ghost" | "destructive";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    "bg-accent text-[rgb(var(--accent-foreground))] shadow-[0_12px_28px_rgb(var(--accent)/0.24)] hover:bg-accent/88",
  secondary:
    "border border-border/55 bg-[rgb(var(--surface-2)/0.74)] text-foreground hover:bg-[rgb(var(--surface-3)/0.88)]",
  ghost:
    "bg-transparent text-muted hover:bg-[rgb(var(--surface-2)/0.72)] hover:text-foreground",
  destructive:
    "border border-rose-400/20 bg-rose-500/14 text-rose-200 hover:bg-rose-500/24",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});
