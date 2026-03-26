import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import {
  dismissToast,
  useToastStore,
  type ToastRecord,
  type ToastVariant,
} from "../../store/toasts";

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    panel: string;
    pill: string;
    title: string;
    message: string;
    progress: string;
    icon: typeof AlertTriangle;
  }
> = {
  success: {
    panel:
      "border-emerald-300/20 bg-[linear-gradient(135deg,rgba(8,73,56,0.92),rgba(12,18,34,0.97))] shadow-[0_22px_60px_rgba(7,94,68,0.34)]",
    pill: "border border-emerald-200/20 bg-emerald-300/10 text-emerald-50",
    title: "text-emerald-50",
    message: "text-emerald-100/85",
    progress: "bg-gradient-to-r from-emerald-100 via-emerald-300 to-teal-400",
    icon: CheckCircle2,
  },
  error: {
    panel:
      "border-rose-400/20 bg-[linear-gradient(135deg,rgba(90,18,46,0.92),rgba(12,18,34,0.97))] shadow-[0_22px_60px_rgba(91,19,46,0.38)]",
    pill: "border border-rose-300/20 bg-rose-400/10 text-rose-100",
    title: "text-rose-50",
    message: "text-rose-100/85",
    progress: "bg-gradient-to-r from-rose-200 via-rose-300 to-rose-500",
    icon: AlertTriangle,
  },
  warning: {
    panel:
      "border-amber-300/20 bg-[linear-gradient(135deg,rgba(77,47,12,0.92),rgba(12,18,34,0.97))] shadow-[0_22px_60px_rgba(120,72,15,0.34)]",
    pill: "border border-amber-200/20 bg-amber-300/10 text-amber-50",
    title: "text-amber-50",
    message: "text-amber-100/85",
    progress: "bg-gradient-to-r from-amber-100 via-amber-300 to-orange-400",
    icon: AlertTriangle,
  },
  info: {
    panel:
      "border-sky-300/20 bg-[linear-gradient(135deg,rgba(11,57,87,0.92),rgba(12,18,34,0.97))] shadow-[0_22px_60px_rgba(9,74,117,0.34)]",
    pill: "border border-sky-200/20 bg-sky-300/10 text-sky-50",
    title: "text-sky-50",
    message: "text-sky-100/85",
    progress: "bg-gradient-to-r from-sky-100 via-sky-300 to-cyan-400",
    icon: Bell,
  },
};

function ToastCard({ toast }: { toast: ToastRecord }) {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(toast.durationMs);
  const [progressWidth, setProgressWidth] = useState(100);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (remainingMs <= 0) {
      dismissToast(toast.id);
      return;
    }

    if (isPaused) {
      return;
    }

    startedAtRef.current = performance.now();
    setProgressWidth((remainingMs / toast.durationMs) * 100);

    const animationFrame = window.requestAnimationFrame(() => {
      setProgressWidth(0);
    });
    const timeoutId = window.setTimeout(() => {
      dismissToast(toast.id);
    }, remainingMs);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeoutId);
    };
  }, [isPaused, remainingMs, toast.durationMs, toast.id]);

  const handlePause = () => {
    if (isPaused) {
      return;
    }

    const elapsed = startedAtRef.current
      ? performance.now() - startedAtRef.current
      : 0;
    const nextRemainingMs = Math.max(0, remainingMs - elapsed);

    setIsPaused(true);
    setRemainingMs(nextRemainingMs);
    setProgressWidth((nextRemainingMs / toast.durationMs) * 100);
  };

  const handleResume = () => {
    if (!isPaused) {
      return;
    }

    setIsPaused(false);
  };

  const styles = VARIANT_STYLES[toast.variant];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5",
        styles.panel,
      )}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      role="status"
      aria-live="polite"
    >
      <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
      <button
        type="button"
        className="absolute left-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-slate-950/45 text-white/70 transition hover:bg-white/10 hover:text-white"
        onClick={() => dismissToast(toast.id)}
        aria-label="Close notification"
        title="Close"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="relative flex items-start gap-3 px-4 pb-4 pt-4 pl-12">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            styles.pill,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div
            className={cn(
              "text-sm font-semibold tracking-[0.01em]",
              styles.title,
            )}
          >
            {toast.title}
          </div>
          <p className={cn("text-sm leading-5", styles.message)}>{toast.message}</p>
        </div>
      </div>
      <div className="h-1 w-full bg-white/8">
        <div
          className={cn("h-full origin-left", styles.progress)}
          style={{
            width: `${progressWidth}%`,
            transition: isPaused ? "none" : `width ${remainingMs}ms linear`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  if (typeof document === "undefined" || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
