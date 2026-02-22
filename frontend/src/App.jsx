import { Routes, Route, Navigate } from "react-router-dom";

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
import Layout from "./components/Layout";
import RegistrationRejected from "./pages/RegistrationRejected";
import EmailConfirmed from "./pages/EmailConfirmed";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Area Wrapped With Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute mode="approved">
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-business"
        element={
          <ProtectedRoute mode="no-business">
            <Layout>
              <RegistrationWizard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/awaiting-approval"
        element={
          <ProtectedRoute mode="pending">
            <Layout>
              <PendingApproval />
            </Layout>
          </ProtectedRoute>
        }
      />
<Route
  path="/registration-rejected"
  element={
    <ProtectedRoute mode="auth">
      <Layout>
        <RegistrationRejected />
      </Layout>
    </ProtectedRoute>
  }
/>
      <Route
        path="/pay-registration"
        element={
          <ProtectedRoute mode="auth">
            <Layout>
              <PayRegistration />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-success"
        element={
          <ProtectedRoute mode="auth">
            <Layout>
              <PaymentSuccess />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-failure"
        element={
          <ProtectedRoute mode="auth">
            <Layout>
              <PaymentFailure />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute mode="admin">
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/registrations"
        element={
          <ProtectedRoute mode="admin">
            <Layout>
              <AdminRegistrations />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit-log"
        element={
          <ProtectedRoute mode="admin">
            <Layout>
              <AdminAuditLog />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/documents"
        element={
          <ProtectedRoute mode="admin">
            <Layout>
              <AdminDocumentReview />
            </Layout>
          </ProtectedRoute>
        }
      />
<Route path="/email-confirmed" element={<EmailConfirmed />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;


