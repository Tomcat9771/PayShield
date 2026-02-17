import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import PendingPayouts from "./PendingPayouts";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Guards from "./Guards";
import AddGuard from "./AddGuard";
import RequireAuth from "./RequireAuth";
import PayGuard from "./pages/PayGuard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentFailure from "./pages/PaymentFailure";
import Payouts from "./Payouts";
import Audit from "./audit";
import Transactions from "./Transactions";
import Reconciliation from "./Reconciliation";
import GuardHistory from "./GuardHistory";
import Layout from "./Layout";
import ResetPassword from "./pages/ResetPassword";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function App() {

  // ✅ AUTH LISTENER MUST LIVE HERE
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
        }

        if (event === "SIGNED_IN") {
          console.log("Supabase session active");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* =====================
            ROOT
        ====================== */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* =====================
            PUBLIC ROUTES
        ====================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PayFast / payment return pages */}
        <Route path="/pay/success" element={<PaymentSuccess />} />
        <Route path="/pay/cancel" element={<PaymentCancel />} />
        <Route path="/pay/failure" element={<PaymentFailure />} />

        {/* Public QR payment page */}
        <Route path="/pay/:guardId" element={<PayGuard />} />

        {/* =====================
            PROTECTED APP (ALL ADMIN UI)
        ====================== */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guards" element={<Guards />} />
          <Route path="/guards/new" element={<AddGuard />} />
          <Route path="/guards/:id/history" element={<GuardHistory />} />

          <Route path="/payouts" element={<Payouts />} />
          <Route path="/payouts/pending" element={<PendingPayouts />} />
          <Route path="/payouts/:id" element={<Payouts />} />

          <Route path="/transactions" element={<Transactions />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/audit" element={<Audit />} />
        </Route>

        {/* =====================
            CATCH-ALL
        ====================== */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
