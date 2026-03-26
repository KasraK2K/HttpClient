import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { showErrorToast } from "../../store/toasts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface CreateSuperuserPageProps {
  onSubmit: (
    username: string,
    password: string,
    confirmPassword: string,
  ) => Promise<void>;
}

export function CreateSuperuserPage({ onSubmit }: CreateSuperuserPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(username, password, confirmPassword);
    } catch (submitError) {
      showErrorToast(submitError, {
        title: "Account Setup Failed",
        fallbackMessage: "Unable to create superuser",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-xl overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/20 p-3 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Create The First Superuser</CardTitle>
              <p className="mt-1 text-sm text-muted">
                HttpClient detected an empty admins collection, so bootstrap starts
                here.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="superadmin"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Strong password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
            />
          </div>
          <Button
            className="md:col-span-2"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !username || !password || !confirmPassword}
          >
            {isSubmitting ? "Creating Account..." : "Create Superuser"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
