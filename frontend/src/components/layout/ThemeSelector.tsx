import { Check, ChevronDown, MoonStar, Palette, SunMedium } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { APP_THEMES, getThemeById, type AppTheme, type ThemeId } from "../../lib/themes";

interface ThemeSelectorProps {
  value: ThemeId;
  onChange: (themeId: ThemeId) => void;
  onPreviewTheme: (themeId: ThemeId) => void;
  onClearPreview: () => void;
}

function ThemePreviewCard({
  theme,
  selected,
  onSelect,
  onPreview,
}: {
  theme: AppTheme;
  selected: boolean;
  onSelect: (themeId: ThemeId) => void;
  onPreview: (themeId: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group relative rounded-2xl border p-2 text-left transition duration-150",
        selected
          ? "border-accent/65 bg-accent/10 shadow-[0_0_0_1px_rgb(var(--accent)/0.16)]"
          : "border-border/50 bg-card/60 hover:border-accent/28 hover:bg-[rgb(var(--surface-2)/0.72)]",
      )}
      onClick={() => onSelect(theme.id as ThemeId)}
      onPointerEnter={() => onPreview(theme.id as ThemeId)}
      onFocus={() => onPreview(theme.id as ThemeId)}
    >
      <span
        className="relative block h-24 overflow-hidden rounded-xl border"
        style={{
          background: theme.preview.backdrop,
          borderColor: theme.preview.border,
        }}
      >
        <span
          className="absolute inset-x-2 top-2 h-2.5 rounded-full"
          style={{ background: theme.preview.header }}
        />
        <span
          className="absolute bottom-2 left-2 top-6 w-8 rounded-lg"
          style={{ background: theme.preview.sidebar }}
        />
        <span
          className="absolute left-12 right-3 top-6 h-4 rounded-md"
          style={{ background: theme.preview.panel }}
        />
        <span
          className="absolute left-12 right-11 top-[2.9rem] h-8 rounded-xl border"
          style={{
            background: theme.preview.panelAlt,
            borderColor: theme.preview.border,
          }}
        />
        <span
          className="absolute right-3 top-[2.9rem] h-8 w-7 rounded-xl"
          style={{ background: theme.preview.accent }}
        />
        <span
          className="absolute left-[3.35rem] top-[3.2rem] h-1.5 w-14 rounded-full opacity-80"
          style={{ background: theme.preview.text }}
        />
        <span
          className="absolute left-[3.35rem] top-[4.2rem] h-1.5 w-8 rounded-full opacity-60"
          style={{ background: theme.preview.accentAlt }}
        />
      </span>
      <span className="mt-3 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {theme.name}
          </span>
          <span className="mt-1 block text-xs leading-4 text-muted">
            {theme.description}
          </span>
        </span>
        {selected ? (
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[rgb(var(--accent-foreground))]">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ThemeSection({
  mode,
  themes,
  selectedThemeId,
  onSelect,
  onPreview,
}: {
  mode: "light" | "dark";
  themes: AppTheme[];
  selectedThemeId: ThemeId;
  onSelect: (themeId: ThemeId) => void;
  onPreview: (themeId: ThemeId) => void;
}) {
  const Icon = mode === "light" ? SunMedium : MoonStar;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-[rgb(var(--surface-2)/0.65)] text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div>{mode === "light" ? "Light Themes" : "Dark Themes"}</div>
          <div className="text-xs font-normal text-muted">
            {mode === "light"
              ? "Bright, airy palettes for daytime work."
              : "Richer palettes for focus and contrast."}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {themes.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            selected={theme.id === selectedThemeId}
            onSelect={onSelect}
            onPreview={onPreview}
          />
        ))}
      </div>
    </section>
  );
}

export function ThemeSelector({
  value,
  onChange,
  onPreviewTheme,
  onClearPreview,
}: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 928,
    maxHeight: 640,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentTheme = getThemeById(value);
  const lightThemes = useMemo(
    () => APP_THEMES.filter((theme) => theme.mode === "light"),
    [],
  );
  const darkThemes = useMemo(
    () => APP_THEMES.filter((theme) => theme.mode === "dark"),
    [],
  );

  useEffect(() => {
    if (!open) {
      onClearPreview();
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const viewportPadding = 12;
      const panelGap = 12;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(window.innerWidth - viewportPadding * 2, 928);
      const availableBelow = Math.max(
        240,
        window.innerHeight - rect.bottom - panelGap - viewportPadding,
      );
      const availableAbove = Math.max(
        240,
        rect.top - panelGap - viewportPadding,
      );
      const showAbove = availableBelow < 360 && availableAbove > availableBelow;
      const top = showAbove
        ? Math.max(viewportPadding, rect.top - panelGap - availableAbove)
        : Math.min(
            rect.bottom + panelGap,
            window.innerHeight - viewportPadding - availableBelow,
          );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.right - width, window.innerWidth - width - viewportPadding),
      );

      setMenuPosition({
        top,
        left,
        width,
        maxHeight: showAbove ? availableAbove : availableBelow,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClearPreview, open]);

  const handleSelect = (themeId: ThemeId) => {
    onChange(themeId);
    onClearPreview();
    setOpen(false);
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[240]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            role="dialog"
            aria-label="Theme selector"
            onPointerLeave={onClearPreview}
          >
            <div className="overflow-auto rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,rgb(var(--surface-1)/0.98),rgb(var(--card)/0.97))] p-5 shadow-[0_34px_90px_rgb(var(--shadow)/0.28)] backdrop-blur-xl">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border/45 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Theme Studio</h3>
                  <p className="mt-1 text-sm text-muted">
                    Hover to preview instantly. Click to apply globally.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/45 bg-[rgb(var(--surface-2)/0.72)] px-3 py-2 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Current</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{currentTheme.name}</div>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <ThemeSection
                  mode="light"
                  themes={lightThemes}
                  selectedThemeId={value}
                  onSelect={handleSelect}
                  onPreview={onPreviewTheme}
                />
                <ThemeSection
                  mode="dark"
                  themes={darkThemes}
                  selectedThemeId={value}
                  onSelect={handleSelect}
                  onPreview={onPreviewTheme}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-2.5 rounded-xl border border-border/55 bg-[rgb(var(--surface-2)/0.64)] px-3 text-sm text-foreground transition hover:bg-[rgb(var(--surface-3)/0.84)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
          open && "bg-[rgb(var(--surface-3)/0.88)]",
        )}
        onClick={() => setOpen((state) => !state)}
        aria-label="Open theme selector"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/14 text-accent">
          <Palette className="h-4 w-4" />
        </span>
        <span className="hidden min-w-0 truncate text-sm font-medium text-foreground sm:block">
          {currentTheme.name}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}

