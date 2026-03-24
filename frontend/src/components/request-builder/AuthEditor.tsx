import type { RequestAuthConfig } from "@restify/shared";
import { Input } from "../ui/input";

interface AuthEditorProps {
  value: RequestAuthConfig;
  onChange: (value: RequestAuthConfig) => void;
}

export function AuthEditor({ value, onChange }: AuthEditorProps) {
  return (
    <div className="space-y-3">
      <select
        className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-foreground"
        value={value.type}
        onChange={(event) => onChange({ type: event.target.value as RequestAuthConfig["type"] })}
      >
        <option value="none">None</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
      </select>
      {value.type === "bearer" ? <Input value={value.token ?? ""} onChange={(event) => onChange({ ...value, token: event.target.value })} placeholder="Bearer token" /> : null}
      {value.type === "basic" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={value.username ?? ""} onChange={(event) => onChange({ ...value, username: event.target.value })} placeholder="Username" />
          <Input type="password" value={value.password ?? ""} onChange={(event) => onChange({ ...value, password: event.target.value })} placeholder="Password" />
        </div>
      ) : null}
    </div>
  );
}
