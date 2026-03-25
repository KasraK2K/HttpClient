import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className={cn("flex max-h-[calc(100vh-2rem)] min-h-0 w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-glow", className)}>
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button className="rounded-lg p-1 text-muted hover:bg-white/8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

