import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { ClientLayout } from "./components/layout/ClientLayout";
import { ToastContainer } from "./components/ui/ToastContainer";
import { Administrators } from "./pages/admin/Administrators";
import { Clients } from "./pages/admin/Clients";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { Packs } from "./pages/admin/Packs";
import { Reports } from "./pages/admin/Reports";
import { Senders } from "./pages/admin/Senders";
import { TestEmailPage } from "./pages/admin/TestEmailPage";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { Billing } from "./pages/client/Billing";
import { Campaigns } from "./pages/client/Campaigns";
import { ClientSenders } from "./pages/client/ClientSenders";
import { Contacts } from "./pages/client/Contacts";
import { ClientDashboard } from "./pages/client/Dashboard";
import { Alerts } from "./pages/shared/Alerts";
import { Profile } from "./pages/shared/Profile";
import { useAuthStore } from "./store/useAuthStore";

type UserRole = "sygalin" | "client";

const dashboardForRole = (role?: UserRole) =>
  role === "sygalin" ? "/admin/dashboard" : "/client/dashboard";

const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole: UserRole;
}) => {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      checkAuth();
    }
  }, [location.pathname, isAuthenticated, checkAuth]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={dashboardForRole(user.role)} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={dashboardForRole(user?.role)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={dashboardForRole(user?.role)} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="sygalin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="packs" element={<Packs />} />
          <Route path="senders" element={<Senders />} />
          <Route path="administrators" element={<Administrators />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="test-email" element={<TestEmailPage />} />
        </Route>

        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRole="client">
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="billing" element={<Billing />} />
          <Route path="senders" element={<ClientSenders />} />
          <Route path="profile" element={<Profile />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
