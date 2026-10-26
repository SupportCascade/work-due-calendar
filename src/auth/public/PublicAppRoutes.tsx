import { ConvexProvider } from "convex/react";
import { Navigate, Outlet, Route, Routes } from "react-router";
import { convex } from "@/auth/convexClient";
import { DashboardPage } from "@/pages";

function PublicShell() {
  return (
    <ConvexProvider client={convex}>
      <Outlet />
    </ConvexProvider>
  );
}

export function PublicAppRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
