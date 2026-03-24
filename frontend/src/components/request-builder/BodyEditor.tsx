import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import type { RequestBodyConfig } from "@restify/shared";
import { createFormValueRow } from "../../lib/request-helpers";
import { KeyValueTable } from "./KeyValueTable";

interface BodyEditorProps {
  value: RequestBodyConfig;
  onChange: (value: RequestBodyConfig) => void;
}

export function BodyEditor({ value, onChange }: BodyEditorProps) {
  return (
    <div className="space-y-3">
      <select
        className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-foreground"
        value={value.type}
        onChange={(event) => onChange({ ...value, type: event.target.value as RequestBodyConfig["type"] })}
      >
        <option value="none">None</option>
        <option value="json">Raw JSON</option>
        <option value="text">Raw Text</option>
        <option value="form-data">Form Data</option>
        <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
      </select>
      {value.type === "json" || value.type === "text" ? (
        <CodeMirror value={value.content ?? ""} height="220px" extensions={value.type === "json" ? [json()] : []} onChange={(content) => onChange({ ...value, content })} />
      ) : null}
      {value.type === "form-data" || value.type === "x-www-form-urlencoded" ? (
        <KeyValueTable rows={value.values ?? [createFormValueRow()]} onChange={(rows) => onChange({ ...value, values: rows })} createRow={createFormValueRow} keyLabel="Field" valueLabel="Value" />
      ) : null}
    </div>
  );
}
