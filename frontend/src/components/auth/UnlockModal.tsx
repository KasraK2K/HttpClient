import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";

interface UnlockModalProps {
  open: boolean;
  title: string;
  description?: string;
  onSubmit: (password: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function UnlockModal({ open, title, description, onSubmit, onOpenChange }: UnlockModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
      setPassword("");
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unlock failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="space-y-4">
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !password}>
            {isSubmitting ? "Unlocking..." : "Unlock"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
