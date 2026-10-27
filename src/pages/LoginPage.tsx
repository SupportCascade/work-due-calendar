import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { controlStyles } from "@/components/controlStyles";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Label } from "@/ui";

function initialNotice(): string {
  const params = new URLSearchParams(window.location.search);
  if (params.get("signin") !== "expired") return "";
  window.history.replaceState(null, "", window.location.pathname);
  return "That sign-in link has expired or isn't valid. Request a new one.";
}

export function LoginPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState(initialNotice);
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
            Sign in with your approved email address
          </p>
        </div>

        <Card className="p-6">
          {sentTo ? (
            <div className="space-y-4 text-center">
              <Mail
                className="mx-auto size-8 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm">
                If <strong>{sentTo}</strong> is approved, a sign-in link is on
                its way. It works for 15 minutes.
              </p>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                onClick={() => setSentTo(null)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async e => {
                e.preventDefault();
                setError("");
                setLoading(true);
                const email = String(
                  new FormData(e.currentTarget).get("email") ?? "",
                ).trim();
                try {
                  const response = await fetch("/api/auth/request-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  if (!response.ok) {
                    const body = (await response.json().catch(() => ({}))) as {
                      error?: string;
                    };
                    throw new Error(body.error);
                  }
                  setSentTo(email);
                } catch (err) {
                  setError(
                    (err instanceof Error && err.message) ||
                      "Couldn't send the link. Please try again.",
                  );
                } finally {
                  setLoading(false);
                }
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
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
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
                {loading ? "Sending..." : "Email me a sign-in link"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
