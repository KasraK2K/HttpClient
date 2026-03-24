import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

interface ContextMenusProps {
  onCreate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function ContextMenus({ onCreate, onDuplicate, onDelete }: ContextMenusProps) {
  return (
    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
      {onCreate ? (
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDuplicate ? (
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button variant="ghost" className="h-7 px-2 text-xs text-rose-300 hover:text-rose-200" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
