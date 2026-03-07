import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
} from "react-aria-components";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from: string =
    (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      navigate(from, { replace: true });
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-250">
        <div className="mx-auto w-full max-w-sm border border-border bg-card p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-card-foreground">
            Sign in
          </h1>
          {error && (
            <p className="mb-4 border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              value={username}
              onChange={setUsername}
              isRequired
              autoComplete="username"
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">
                Username
              </Label>
              <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              <FieldError className="text-sm text-destructive" />
            </TextField>
            <TextField
              value={password}
              onChange={setPassword}
              isRequired
              type="password"
              autoComplete="current-password"
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              <FieldError className="text-sm text-destructive" />
            </TextField>
            <Button
              type="submit"
              className="mt-2 cursor-pointer border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 pressed:bg-primary/80"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
