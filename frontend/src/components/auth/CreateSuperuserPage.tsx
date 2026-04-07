import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { showErrorToast } from "../../store/toasts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface CreateSuperuserPageProps {
  requiresSetupSecret: boolean;
  onSubmit: (
    username: string,
    password: string,
    confirmPassword: string,
    setupSecret?: string,
  ) => Promise<void>;
}

export function CreateSuperuserPage({
  requiresSetupSecret,
  onSubmit,
}: CreateSuperuserPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(
        username,
        password,
        confirmPassword,
        requiresSetupSecret ? setupSecret : undefined,
      );
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute left-[8%] top-[14%] h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[10%] h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <Card className="relative w-full max-w-xl overflow-hidden rounded-[1.7rem] border-border/60 bg-[linear-gradient(180deg,rgb(var(--surface-1)/0.95),rgb(var(--card)/0.92))] shadow-[0_34px_90px_rgb(var(--shadow)/0.34)]">
        <CardHeader className="border-b border-border/45 bg-[linear-gradient(180deg,rgb(var(--surface-2)/0.78),rgb(var(--surface-1)/0.46))] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="rounded-[1.35rem] border border-emerald-400/20 bg-emerald-400/12 p-3 text-emerald-300 shadow-[0_12px_28px_rgba(52,211,153,0.12)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Create The First Superuser</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted">
                HttpClient found an empty admins collection, so the first secure account starts here.
              </p>
              {requiresSetupSecret ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  This server requires the one-time setup secret from your deployment environment before the first superuser can be created.
                </p>
              ) : null}
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
          {requiresSetupSecret ? (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-muted">Setup Secret</label>
              <Input
                type="password"
                value={setupSecret}
                onChange={(event) => setSetupSecret(event.target.value)}
                placeholder="Deployment setup secret"
              />
            </div>
          ) : null}
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
            className="mt-1 h-11 rounded-xl md:col-span-2"
            onClick={() => void handleSubmit()}
            disabled={
              isSubmitting ||
              !username ||
              !password ||
              !confirmPassword ||
              (requiresSetupSecret && !setupSecret)
            }
          >
            {isSubmitting ? "Creating Account..." : "Create Superuser"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
