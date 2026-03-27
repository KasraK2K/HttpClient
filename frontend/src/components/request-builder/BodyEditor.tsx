import type { ProjectEnvVar, RequestBodyConfig } from "@restify/shared";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
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

function getDocumentThemeMode() {
  if (typeof document === "undefined") {
    return "dark" as const;
  }

  return document.documentElement.dataset.themeMode === "light"
    ? ("light" as const)
    : ("dark" as const);
}

export function BodyEditor({ value, envVars, onChange }: BodyEditorProps) {
  const [themeMode, setThemeMode] = useState(getDocumentThemeMode);
  const resolution =
    value.type === "json" || value.type === "text"
      ? resolveVariableInputs([value.content ?? ""], envVars)
      : resolveRequestBodyResolution(value, envVars);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(getDocumentThemeMode());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme-mode"],
    });

    return () => observer.disconnect();
  }, []);

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
            ? "bg-accent text-[rgb(var(--accent-foreground))]"
            : "text-foreground hover:bg-[rgb(var(--surface-3)/0.78)]"
        }
      />
      {value.type === "json" || value.type === "text" ? (
        <>
          <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-border/55 bg-[rgb(var(--editor-bg))] shadow-inner">
            <CodeMirror
              className="request-body-editor h-full w-full text-sm"
              theme={themeMode === "dark" ? oneDark : undefined}
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
