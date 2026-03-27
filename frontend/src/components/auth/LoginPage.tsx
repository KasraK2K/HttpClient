import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import httpClientLogo from "../../assets/httpclient-logo.svg";
import { showErrorToast } from "../../store/toasts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface LoginPageProps {
  onSubmit: (username: string, password: string) => Promise<void>;
}

export function LoginPage({ onSubmit }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (submitError) {
      showErrorToast(submitError, {
        title: "Sign In Failed",
        fallbackMessage: "Login failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute left-[10%] top-[12%] h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-44 w-44 rounded-full bg-[rgb(var(--surface-3)/0.42)] blur-3xl" />
      <Card className="relative w-full max-w-md overflow-hidden rounded-[1.6rem] border-border/60 bg-[linear-gradient(180deg,rgb(var(--surface-1)/0.94),rgb(var(--card)/0.92))] shadow-[0_30px_90px_rgb(var(--shadow)/0.32)]">
        <CardHeader className="border-b border-border/45 bg-[linear-gradient(180deg,rgb(var(--surface-2)/0.78),rgb(var(--surface-1)/0.42))] p-6">
          <div className="space-y-5">
            <img
              src={httpClientLogo}
              alt="HttpClient"
              className="block h-10 w-auto max-w-[184px]"
            />
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/12 text-accent shadow-[0_10px_24px_rgb(var(--accent)/0.18)]">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base">Sign In</CardTitle>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Access your REST workspaces, saved environments, and recent request history.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm text-muted">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </div>
          <Button
            className="mt-2 h-11 w-full rounded-xl"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !username || !password}
          >
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? "Signing In..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
