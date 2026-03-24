import { Plus, Trash2 } from "lucide-react";
import type { FormValueRow, HeaderRow, QueryParamRow } from "@restify/shared";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type Row = HeaderRow | QueryParamRow | FormValueRow;

interface KeyValueTableProps<T extends Row> {
  rows: T[];
  onChange: (rows: T[]) => void;
  createRow: () => T;
  keyLabel?: string;
  valueLabel?: string;
  showEnabled?: boolean;
}

export function KeyValueTable<T extends Row>({ rows, onChange, createRow, keyLabel = "Key", valueLabel = "Value", showEnabled = true }: KeyValueTableProps<T>) {
  const updateRow = (index: number, patch: Partial<T>) => {
    const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
    onChange(nextRows);
  };

  const removeRow = (index: number) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[96px_1fr_1fr_72px_56px] gap-2 px-1 text-xs uppercase tracking-wide text-muted">
        <span>{keyLabel}</span>
        <span className="sr-only">Key</span>
        <span>{valueLabel}</span>
        <span>{showEnabled ? "Enabled" : ""}</span>
        <span className="sr-only">Actions</span>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[96px_1fr_1fr_72px_56px] gap-2">
            <Input value={row.key} onChange={(event) => updateRow(index, { key: event.target.value } as Partial<T>)} placeholder={keyLabel} className="h-10" />
            <Input value={row.value} onChange={(event) => updateRow(index, { value: event.target.value } as Partial<T>)} placeholder={valueLabel} className="col-span-2 h-10" />
            {showEnabled ? (
              <label className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs text-muted">
                <input checked={row.enabled} onChange={(event) => updateRow(index, { enabled: event.target.checked } as Partial<T>)} type="checkbox" />
              </label>
            ) : (
              <div />
            )}
            <Button variant="ghost" className="h-10 px-2 text-rose-300 hover:text-rose-200" onClick={() => removeRow(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={() => onChange([...rows, createRow()])}>
        <Plus className="h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}
