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
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-white/10 bg-slate-950/80 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
        <CardHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="space-y-4">
            <img
              src={httpClientLogo}
              alt="HttpClient"
              className="block h-10 w-auto max-w-[184px]"
            />
            <div>
              <CardTitle>Sign In</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Access your REST workspaces, request history, and saved environments.
              </p>
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
            className="w-full"
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
