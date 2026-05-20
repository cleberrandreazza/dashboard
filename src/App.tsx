import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadsPage } from "@/pages/UploadsPage";
import { PresentationsPage } from "@/pages/PresentationsPage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { LookerExportPage } from "@/pages/LookerExportPage";
import { UsersPage } from "@/pages/UsersPage";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { EnvConfigBanner } from "@/components/layout/EnvConfigBanner";

function AppRoutes() {
  return (
    <SessionGuard>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/uploads"
          element={
            <AppShell>
              <UploadsPage />
            </AppShell>
          }
        />
        <Route
          path="/presentations"
          element={
            <AppShell>
              <PresentationsPage />
            </AppShell>
          }
        />
        <Route
          path="/profiles"
          element={
            <AppShell>
              <ProfilesPage />
            </AppShell>
          }
        />
        <Route
          path="/looker"
          element={
            <AppShell>
              <LookerExportPage />
            </AppShell>
          }
        />
        <Route
          path="/users"
          element={
            <AppShell>
              <UsersPage />
            </AppShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionGuard>
  );
}

export default function App() {
  return (
    <ConvexClientProvider>
      <BrowserRouter>
        <EnvConfigBanner />
        <AuthLoading>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </AuthLoading>
        <Unauthenticated>
          <LoginPage />
        </Unauthenticated>
        <Authenticated>
          <AppRoutes />
        </Authenticated>
      </BrowserRouter>
    </ConvexClientProvider>
  );
}
