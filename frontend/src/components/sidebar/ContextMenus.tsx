import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

interface ContextMenusProps {
  onCreate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function ContextMenus({
  onCreate,
  onDuplicate,
  onDelete,
}: ContextMenusProps) {
  if (!onCreate && !onDuplicate && !onDelete) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-1 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
      {onCreate ? (
        <Button
          variant="ghost"
          className="h-7 w-7 rounded-md p-0 text-muted hover:text-foreground"
          onClick={onCreate}
          aria-label="Create"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDuplicate ? (
        <Button
          variant="ghost"
          className="h-7 w-7 rounded-md p-0 text-muted hover:text-foreground"
          onClick={onDuplicate}
          aria-label="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          className="h-7 w-7 rounded-md p-0 text-rose-300 hover:text-rose-200"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
