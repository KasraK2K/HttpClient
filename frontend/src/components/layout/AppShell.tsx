import type { ReactNode } from "react";
import { Layers3, LogOut, Send, Workflow } from "lucide-react";
import type { AdminUser, User } from "@restify/shared";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface AppShellProps {
  user: AdminUser | User;
  activeWorkspaceName?: string;
  activeProjectName?: string;
  activeRequestName?: string;
  sidebar: ReactNode;
  builder: ReactNode;
  response: ReactNode;
  inspector: ReactNode;
  onLogout: () => Promise<void>;
}

interface ActiveContextPanelProps {
  icon: ReactNode;
  label: string;
  value?: string;
  emptyLabel: string;
}

function ActiveContextPanel({
  icon,
  label,
  value,
  emptyLabel,
}: ActiveContextPanelProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted">
        <span className="text-accent">{icon}</span>
        <span>{label}</span>
      </div>
      <div
        className="mt-2 min-w-0 break-words text-sm font-medium leading-5 text-foreground"
        title={value ?? emptyLabel}
      >
        {value ?? emptyLabel}
      </div>
    </div>
  );
}

export function AppShell({
  user,
  activeWorkspaceName,
  activeProjectName,
  activeRequestName,
  sidebar,
  builder,
  response,
  inspector,
  onLogout,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs uppercase tracking-[0.28em] text-accent">Restify</div>
              <Badge className="border-white/10 bg-white/4 text-foreground">
                {user.role}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ActiveContextPanel
                icon={<Layers3 className="h-3.5 w-3.5" />}
                label="Workspace"
                value={activeWorkspaceName}
                emptyLabel="No workspace selected"
              />
              <ActiveContextPanel
                icon={<Workflow className="h-3.5 w-3.5" />}
                label="Project"
                value={activeProjectName}
                emptyLabel="No project selected"
              />
              <ActiveContextPanel
                icon={<Send className="h-3.5 w-3.5" />}
                label="Request"
                value={activeRequestName}
                emptyLabel="No request selected"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 xl:min-w-[260px] xl:justify-start">
            <div className="min-w-0 text-sm text-muted xl:text-right">
              <div className="font-medium text-foreground">{user.username}</div>
              <div>Same-origin secure session</div>
            </div>
            <Button variant="secondary" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)_340px] gap-5 p-5 max-[1500px]:grid-cols-[350px_minmax(0,1fr)_320px] max-[1280px]:grid-cols-1">
        <aside className="min-h-0">{sidebar}</aside>
        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(280px,40%)] gap-4">{builder}{response}</section>
        <aside className="min-h-0 overflow-y-auto">{inspector}</aside>
      </main>
    </div>
  );
}

