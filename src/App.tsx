import { useCallback, useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/Toaster";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DashboardPage, LoginPage } from "./pages";

type Session =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; email: string };

function App() {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async response =>
        response.ok
          ? setSession({
              status: "signed-in",
              email: ((await response.json()) as { email: string }).email,
            })
          : setSession({ status: "signed-out" }),
      )
      .catch(() => setSession({ status: "signed-out" }));
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSession({ status: "signed-out" });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable>
        <Toaster />
        {session.status === "signed-in" ? (
          <DashboardPage
            email={session.email}
            onSignOut={signOut}
            onSessionExpired={() => setSession({ status: "signed-out" })}
          />
        ) : session.status === "signed-out" ? (
          <LoginPage />
        ) : null}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
