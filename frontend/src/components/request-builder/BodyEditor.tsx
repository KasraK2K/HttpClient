import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
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
        className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground"
        value={value.type}
        onChange={(event) =>
          onChange({
            ...value,
            type: event.target.value as RequestBodyConfig["type"],
          })
        }
      >
        <option value="none">None</option>
        <option value="json">Raw JSON</option>
        <option value="text">Raw Text</option>
        <option value="form-data">Form Data</option>
        <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
      </select>
      {value.type === "json" || value.type === "text" ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-inner shadow-black/20">
          <CodeMirror
            className="request-body-editor text-sm"
            theme={oneDark}
            value={value.content ?? ""}
            height="240px"
            extensions={value.type === "json" ? [json()] : []}
            onChange={(content) => onChange({ ...value, content })}
          />
        </div>
      ) : null}
      {value.type === "form-data" || value.type === "x-www-form-urlencoded" ? (
        <KeyValueTable
          rows={value.values ?? [createFormValueRow()]}
          onChange={(rows) => onChange({ ...value, values: rows })}
          createRow={createFormValueRow}
          keyLabel="Field"
          valueLabel="Value"
        />
      ) : null}
    </div>
  );
}
