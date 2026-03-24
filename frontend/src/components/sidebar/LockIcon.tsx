import { Lock, LockOpen } from "lucide-react";

interface LockIconProps {
  locked: boolean;
}

export function LockIcon({ locked }: LockIconProps) {
  const Icon = locked ? Lock : LockOpen;
  return <Icon className={`h-3.5 w-3.5 ${locked ? "text-amber-300" : "text-emerald-300"}`} />;
}
