"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { controlStyles } from "@/components/controlStyles";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Label } from "@/ui";

export function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Cascade Web Solutions
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Work due dates
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to see the calendar
          </p>
        </div>

        <Card className="p-6">
          <form
            className="space-y-4"
            onSubmit={async e => {
              e.preventDefault();
              setError("");
              setLoading(true);
              const form = new FormData(e.currentTarget);
              try {
                const result = await signIn("credentials", {
                  email: String(form.get("email") ?? ""),
                  password: String(form.get("password") ?? ""),
                  redirect: false,
                });
                if (result?.ok && !result.error) {
                  window.location.assign("/");
                  return;
                }
                setError("Wrong email or password.");
              } catch {
                setError("Couldn't sign in. Please try again.");
              }
              setLoading(false);
            }}
          >
            <div className="space-y-2">
              <Label
                className="text-sm font-medium leading-none"
                htmlFor="email"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@cascadewebsolutions.co"
                autoComplete="email"
                className={cn(controlStyles.input, "h-11")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                className="text-sm font-medium leading-none"
                htmlFor="password"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={cn(controlStyles.input, "h-11")}
                required
              />
            </div>
            {error && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              className={cn(
                controlStyles.primaryButton,
                "h-11 px-6 text-base w-full",
              )}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export function LoginScreen() {
  return (
    <ThemeProvider defaultTheme="system" switchable>
      <LoginPage />
    </ThemeProvider>
  );
}
