import { Badge } from "../ui/badge";

interface StatusBadgeProps {
  status?: number;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return <Badge>No Response</Badge>;
  }

  const tone = status >= 200 && status < 300
    ? "border-emerald-400/20 bg-emerald-500/12 text-emerald-300"
    : status >= 300 && status < 400
      ? "border-amber-400/20 bg-amber-500/12 text-amber-300"
      : "border-rose-400/20 bg-rose-500/12 text-rose-300";

  return <Badge className={tone}>{status}</Badge>;
}
