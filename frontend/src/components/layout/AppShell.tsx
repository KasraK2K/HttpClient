import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import type { AdminUser, User } from "@restify/shared";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface AppShellProps {
  user: AdminUser | User;
  activeWorkspaceName?: string;
  activeProjectName?: string;
  sidebar: ReactNode;
  builder: ReactNode;
  response: ReactNode;
  inspector: ReactNode;
  onLogout: () => Promise<void>;
}

export function AppShell({ user, activeWorkspaceName, activeProjectName, sidebar, builder, response, inspector, onLogout }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-accent">Restify</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {activeWorkspaceName ? <Badge>{activeWorkspaceName}</Badge> : null}
              {activeProjectName ? <Badge>{activeProjectName}</Badge> : null}
              <Badge className="border-white/10 bg-white/4 text-foreground">{user.role}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-muted">
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
      <main className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_360px] gap-4 p-4 max-[1280px]:grid-cols-1">
        <aside className="min-h-0">{sidebar}</aside>
        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(280px,40%)] gap-4">{builder}{response}</section>
        <aside className="min-h-0 overflow-y-auto">{inspector}</aside>
      </main>
    </div>
  );
}
