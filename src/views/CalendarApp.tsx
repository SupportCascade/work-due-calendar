"use client";

import { signOut } from "next-auth/react";
import { useCallback } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/Toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardPage } from "./DashboardPage";

export default function CalendarApp({ email }: { email: string }) {
  const handleSignOut = useCallback(() => {
    void signOut({ callbackUrl: "/login" });
  }, []);
  const handleSessionExpired = useCallback(() => {
    window.location.assign("/login");
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable>
        <Toaster />
        <DashboardPage
          email={email}
          onSignOut={handleSignOut}
          onSessionExpired={handleSessionExpired}
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
