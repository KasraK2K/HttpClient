import type { ProjectDoc, WorkspaceMeta } from "@restify/shared";
import { Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface PasswordSettingsProps {
  workspace?: WorkspaceMeta;
  project?: ProjectDoc;
  onSaveWorkspace: (enabled: boolean, password?: string) => Promise<void>;
  onSaveProject: (enabled: boolean, password?: string) => Promise<void>;
}

export function PasswordSettings({ workspace, project, onSaveWorkspace, onSaveProject }: PasswordSettingsProps) {
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [projectPassword, setProjectPassword] = useState("");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Security</CardTitle>
            <p className="mt-1 text-xs text-muted">Workspace and project protection issue separate unlock tokens.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">Workspace Password</div>
              <div className="text-xs text-muted">{workspace?.name ?? "No workspace selected"}</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input checked={workspace?.isPasswordProtected ?? false} onChange={(event) => onSaveWorkspace(event.target.checked, workspacePassword)} disabled={!workspace} type="checkbox" />
              Protected
            </label>
          </div>
          <div className="flex gap-2">
            <Input type="password" value={workspacePassword} onChange={(event) => setWorkspacePassword(event.target.value)} placeholder="New workspace password" disabled={!workspace} />
            <Button variant="secondary" onClick={() => onSaveWorkspace(true, workspacePassword)} disabled={!workspace || !workspacePassword}>
              Save
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">Project Password</div>
              <div className="text-xs text-muted">{project?.name ?? "No project selected"}</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input checked={project?.isPasswordProtected ?? false} onChange={(event) => onSaveProject(event.target.checked, projectPassword)} disabled={!project} type="checkbox" />
              Protected
            </label>
          </div>
          <div className="flex gap-2">
            <Input type="password" value={projectPassword} onChange={(event) => setProjectPassword(event.target.value)} placeholder="New project password" disabled={!project} />
            <Button variant="secondary" onClick={() => onSaveProject(true, projectPassword)} disabled={!project || !projectPassword}>
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
