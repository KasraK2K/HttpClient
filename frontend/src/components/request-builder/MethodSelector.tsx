import type { HttpMethod } from "@restify/shared";
import { METHOD_OPTIONS, METHOD_STYLES } from "../../lib/methods";
import { cn } from "../../lib/cn";

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelector({ value, onChange }: MethodSelectorProps) {
  return (
    <select
      className={cn("h-11 rounded-xl border px-3 text-sm font-semibold outline-none transition", METHOD_STYLES[value])}
      value={value}
      onChange={(event) => onChange(event.target.value as HttpMethod)}
    >
      {METHOD_OPTIONS.map((method) => (
        <option key={method} value={method}>
          {method}
        </option>
      ))}
    </select>
  );
}
