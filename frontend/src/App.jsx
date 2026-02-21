import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RegistrationWizard from "./pages/RegistrationWizard";
import PendingApproval from "./pages/PendingApproval";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminAuditLog from "./pages/AdminAuditLog";
import PayRegistration from "./pages/PayRegistration";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import AdminDocumentReview from "./pages/AdminDocumentReview";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const navigate = useNavigate();
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate("/login", { replace: true });
};

<button onClick={handleLogout}>Logout</button>

function App() {
  
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Create Business (must be logged in and have NO business) */}
      <Route
        path="/create-business"
        element={
          <ProtectedRoute mode="no-business">
            <RegistrationWizard />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/registrations"
        element={
          <ProtectedRoute mode="admin">
            <AdminRegistrations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit-log"
        element={
          <ProtectedRoute mode="admin">
            <AdminAuditLog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/documents"
        element={
          <ProtectedRoute mode="admin">
            <AdminDocumentReview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute mode="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Payments */}
      <Route
        path="/pay-registration"
        element={
          <ProtectedRoute mode="auth">
            <PayRegistration />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-success"
        element={
          <ProtectedRoute mode="auth">
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-failure"
        element={
          <ProtectedRoute mode="auth">
            <PaymentFailure />
          </ProtectedRoute>
        }
      />

      {/* Pending Approval */}
      <Route
        path="/awaiting-approval"
        element={
          <ProtectedRoute mode="pending">
            <PendingApproval />
          </ProtectedRoute>
        }
      />

      {/* Dashboard (must be approved) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute mode="approved">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;