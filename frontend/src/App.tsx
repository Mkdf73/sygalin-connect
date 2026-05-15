import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "./components/ui/ToastContainer";
import { AdminLayout } from "./components/layout/AdminLayout";
import { ClientLayout } from "./components/layout/ClientLayout";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { Clients } from "./pages/admin/Clients";
import { Packs } from "./pages/admin/Packs";
import { Senders } from "./pages/admin/Senders";
import { Administrators } from "./pages/admin/Administrators";
import { Reports } from "./pages/admin/Reports";
import { Profile } from "./pages/shared/Profile";
import { Alerts } from "./pages/shared/Alerts";
import { TestEmailPage } from "./pages/admin/TestEmailPage";
import { ClientDashboard } from "./pages/client/Dashboard";
import { Campaigns } from "./pages/client/Campaigns";
import { Contacts } from "./pages/client/Contacts";
import { Billing } from "./pages/client/Billing";
import { ClientSenders } from "./pages/client/ClientSenders";
import { useAuthStore } from "./store/useAuthStore";

// Interface de protection des routes
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
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

  if (allowedRole && user.role !== allowedRole && user.role !== "sygalin") {
    // Si l'utilisateur arrive ici, c'est obligatoirement un client essayant d'accéder à l'admin
    return <Navigate to="/client/dashboard" replace />;
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
            isAuthenticated 
              ? <Navigate to={user?.role === "sygalin" ? "/admin/dashboard" : "/client/dashboard"} replace /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/login" 
          element={
            isAuthenticated 
              ? <Navigate to={user?.role === "sygalin" ? "/admin/dashboard" : "/client/dashboard"} replace /> 
              : <Login />
          } 
        />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Routes Admin protégées */}
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

        {/* Routes Client protégées */}
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
