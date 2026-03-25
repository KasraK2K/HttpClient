import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { RequestBodyConfig } from "@restify/shared";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { cn } from "../../lib/cn";
import { createFormValueRow } from "../../lib/request-helpers";
import {
  DropdownSelect,
  type DropdownOption,
} from "../ui/DropdownSelect";
import { KeyValueTable } from "./KeyValueTable";

interface BodyEditorProps {
  value: RequestBodyConfig;
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

const BODY_EDITOR_HEIGHT_KEY = "httpclient.request-body-height";
const DEFAULT_BODY_EDITOR_HEIGHT = 240;
const MIN_BODY_EDITOR_HEIGHT = 180;
const MAX_BODY_EDITOR_HEIGHT = 720;

function clampBodyEditorHeight(height: number) {
  return Math.min(
    MAX_BODY_EDITOR_HEIGHT,
    Math.max(MIN_BODY_EDITOR_HEIGHT, Math.round(height)),
  );
}

export function BodyEditor({ value, onChange }: BodyEditorProps) {
  const resizeStateRef = useRef({
    startHeight: DEFAULT_BODY_EDITOR_HEIGHT,
    startY: 0,
  });
  const [editorHeight, setEditorHeight] = useState(DEFAULT_BODY_EDITOR_HEIGHT);
  const [isResizingEditor, setIsResizingEditor] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedHeight = window.localStorage.getItem(BODY_EDITOR_HEIGHT_KEY);
      if (!storedHeight) {
        return;
      }

      const parsedHeight = Number(storedHeight);
      if (!Number.isNaN(parsedHeight)) {
        setEditorHeight(clampBodyEditorHeight(parsedHeight));
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        BODY_EDITOR_HEIGHT_KEY,
        String(editorHeight),
      );
    } catch {
      return;
    }
  }, [editorHeight]);

  useEffect(() => {
    if (!isResizingEditor) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientY - resizeStateRef.current.startY;
      setEditorHeight(
        clampBodyEditorHeight(resizeStateRef.current.startHeight + delta),
      );
    };

    const stopResizing = () => setIsResizingEditor(false);

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [isResizingEditor]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      startHeight: editorHeight,
      startY: event.clientY,
    };
    setIsResizingEditor(true);
  };

  return (
    <div className="space-y-3">
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
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-inner shadow-black/20">
          <CodeMirror
            className="request-body-editor text-sm"
            theme={oneDark}
            value={value.content ?? ""}
            height={`${editorHeight}px`}
            extensions={value.type === "json" ? [json()] : []}
            onChange={(content) => onChange({ ...value, content })}
          />
          <button
            className="group flex h-4 w-full cursor-row-resize items-center justify-center border-t border-white/8 bg-slate-950/75 transition hover:bg-slate-900"
            onPointerDown={handleResizeStart}
            type="button"
            aria-label="Resize request body editor"
            title="Resize request body editor"
          >
            <span
              className={cn(
                "h-1 w-12 rounded-full bg-white/15 transition",
                isResizingEditor
                  ? "bg-accent/70"
                  : "group-hover:bg-white/30",
              )}
            />
          </button>
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