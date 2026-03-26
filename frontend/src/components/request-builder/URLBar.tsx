import { LoaderCircle, SendHorizontal } from "lucide-react";
import type { VariableResolution } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { VariableBadges } from "./VariableBadges";

interface URLBarProps {
  value: string;
  resolution: VariableResolution;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
}

export function URLBar({
  value,
  resolution,
  onChange,
  onSend,
  onCancel,
  isSending,
}: URLBarProps) {
  return (
    <div className="min-w-0 flex-1 space-y-2.5">
      <div className="flex min-w-0 flex-col gap-2.5 min-[980px]:flex-row min-[980px]:items-center">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 min-w-0 flex-1 font-mono text-sm"
          placeholder="https://api.example.com/users/{{userId}}"
        />
        <Button
          variant={isSending ? "destructive" : "default"}
          className="h-11 shrink-0 justify-center px-5 font-semibold"
          onClick={isSending ? onCancel : onSend}
          disabled={!isSending && !value.trim()}
          title={isSending ? "Cancel request" : "Send request (Ctrl+Enter)"}
        >
          {isSending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
          {isSending ? "Cancel" : "Send"}
        </Button>
      </div>
      <VariableBadges resolution={resolution} />
    </div>
  );
}
