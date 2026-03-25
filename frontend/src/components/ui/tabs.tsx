import * as React from "react";
import { cn } from "../../lib/cn";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  className,
  children,
}: React.PropsWithChildren<TabsContextValue & { className?: string }>) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: React.PropsWithChildren<{ value: string; className?: string }>) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used inside Tabs");
  }

  const active = context.value === value;
  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1.5 text-[13px] leading-5 transition",
        active
          ? "bg-accent text-slate-950"
          : "text-muted hover:bg-white/6 hover:text-foreground",
        className,
      )}
      onClick={() => context.onValueChange(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: React.PropsWithChildren<{ value: string; className?: string }>) {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
