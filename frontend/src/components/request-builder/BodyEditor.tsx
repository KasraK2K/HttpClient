import type { ProjectEnvVar, RequestBodyConfig } from "@restify/shared";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import {
  resolveRequestBodyResolution,
  resolveVariableInputs,
} from "../../lib/var-resolver";
import { createFormValueRow } from "../../lib/request-helpers";
import {
  DropdownSelect,
  type DropdownOption,
} from "../ui/DropdownSelect";
import { KeyValueTable } from "./KeyValueTable";
import { FormDataTable } from "./FormDataTable";
import { VariableBadges } from "./VariableBadges";

interface BodyEditorProps {
  value: RequestBodyConfig;
  envVars: ProjectEnvVar[];
  onChange: (value: RequestBodyConfig) => void;
}

const BODY_TYPE_OPTIONS: Array<DropdownOption<RequestBodyConfig["type"]>> = [
  { value: "none", label: "None" },
  { value: "json", label: "Raw JSON" },
  { value: "text", label: "Raw Text" },
  { value: "form-data", label: "Form Data" },
  {
    value: "x-www-form-urlencoded",
    label: "x-www-form-urlencoded",
  },
];

export function BodyEditor({ value, envVars, onChange }: BodyEditorProps) {
  const resolution =
    value.type === "json" || value.type === "text"
      ? resolveVariableInputs([value.content ?? ""], envVars)
      : resolveRequestBodyResolution(value, envVars);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3">
      <DropdownSelect
        value={value.type}
        options={BODY_TYPE_OPTIONS}
        onChange={(type) => onChange({ ...value, type })}
        ariaLabel="Select request body type"
        triggerClassName="max-w-full sm:w-[220px]"
        getItemClassName={(_option, isSelected) =>
          isSelected
            ? "bg-accent text-slate-950"
            : "text-foreground hover:bg-white/[0.06]"
        }
      />
      {value.type === "json" || value.type === "text" ? (
        <>
          <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-inner shadow-black/20">
            <CodeMirror
              className="request-body-editor h-full w-full text-sm"
              theme={oneDark}
              value={value.content ?? ""}
              height="100%"
              extensions={value.type === "json" ? [json()] : []}
              onChange={(content) => onChange({ ...value, content })}
            />
          </div>
          <VariableBadges resolution={resolution} />
        </>
      ) : null}
      {value.type === "form-data" ? (
        <FormDataTable
          rows={value.values ?? [createFormValueRow()]}
          envVars={envVars}
          onChange={(rows) => onChange({ ...value, values: rows })}
        />
      ) : null}
      {value.type === "x-www-form-urlencoded" ? (
        <KeyValueTable
          rows={value.values ?? [createFormValueRow()]}
          onChange={(rows) => onChange({ ...value, values: rows })}
          createRow={createFormValueRow}
          keyLabel="Field"
          valueLabel="Value"
          envVars={envVars}
        />
      ) : null}
    </div>
  );
}
