import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Shell } from "./layout/Shell";
import { LoginPage } from "./pages/LoginPage";
import { OperatorDashboard } from "./pages/OperatorDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role?: "admin" | "operator";
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin" && user.role !== "admin") {
    return <Navigate to="/operator" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/operator" replace />} />
        <Route
          path="/operator"
          element={
            <Protected>
              <OperatorDashboard />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected role="admin">
              <AdminDashboard />
            </Protected>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}