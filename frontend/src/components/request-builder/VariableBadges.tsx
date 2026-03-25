import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/cn";
import type { VariableResolution } from "../../types";
import { Badge } from "../ui/badge";

interface VariableBadgesProps {
  resolution: VariableResolution;
  className?: string;
}

export function VariableBadges({
  resolution,
  className,
}: VariableBadgesProps) {
  if (
    resolution.resolved.length === 0 &&
    resolution.unresolved.length === 0
  ) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {resolution.resolved.map((variable) => (
        <Badge
          key={`resolved-${variable}`}
          className="border-emerald-400/20 bg-emerald-500/12 text-emerald-300"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {variable}
        </Badge>
      ))}
      {resolution.unresolved.map((variable) => (
        <Badge
          key={`unresolved-${variable}`}
          className="border-rose-400/20 bg-rose-500/12 text-rose-300"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {variable}
        </Badge>
      ))}
    </div>
  );
}
