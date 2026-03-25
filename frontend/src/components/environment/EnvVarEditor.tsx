import type { ProjectEnvVar } from "@restify/shared";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface EnvVarEditorProps {
  projectName?: string;
  envVars: ProjectEnvVar[];
  onChange: (envVars: ProjectEnvVar[]) => void;
  onSave: () => void;
}

export function EnvVarEditor({ projectName, envVars, onChange, onSave }: EnvVarEditorProps) {
  const updateRow = (index: number, patch: Partial<ProjectEnvVar>) => {
    onChange(envVars.map((envVar, envIndex) => (envIndex === index ? { ...envVar, ...patch } : envVar)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Environment</CardTitle>
            <p className="mt-1 text-xs text-muted">{projectName ? `${projectName} variables` : "Select a project to edit environment variables."}</p>
          </div>
          <Button variant="secondary" onClick={onSave} disabled={!projectName}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {envVars.map((envVar, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_44px] gap-2">
            <Input value={envVar.key} onChange={(event) => updateRow(index, { key: event.target.value })} placeholder="API_BASE_URL" />
            <Input value={envVar.value} onChange={(event) => updateRow(index, { value: event.target.value })} placeholder="https://api.example.com" />
            <Button variant="ghost" className="px-2 text-rose-300" onClick={() => onChange(envVars.filter((_, envIndex) => envIndex !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => onChange([...envVars, { key: "", value: "" }])}>
          <Plus className="h-4 w-4" />
          Add Variable
        </Button>
      </CardContent>
    </Card>
  );
}
