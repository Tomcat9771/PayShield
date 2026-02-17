import { useNavigate } from "react-router-dom";
import Breadcrumb from "./components/Breadcrumb";

export default function Dashboard() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("guardpay_token");
    navigate("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#5b1f75", // deep purple
        padding: "30px",
        color: "#fff",
      }}
    >
      {/* ===============================
          HEADER / BRAND
      =============================== */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <img
          src="/shieldpay-logo.png"
          alt="PayShield"
          style={{ height: 48, marginRight: 15 }}
        />
        <h1 style={{ margin: 0, color: "#f5c400" }}>PayShield</h1>
      </div>

      {/* ===============================
          BREADCRUMB
      =============================== */}
      <Breadcrumb items={[{ label: "Dashboard" }]} />

      {/* ===============================
          CARD CONTAINER
      =============================== */}
      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#000",
          borderRadius: 12,
          padding: 24,
          maxWidth: 520,
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>
          Admin Dashboard
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          {/* GUARDS */}
          <button style={btn} onClick={() => navigate("/guards")}>
            👮 View Guards
          </button>

          <button style={btn} onClick={() => navigate("/guards/new")}>
            ➕ Add Guard
          </button>

          {/* PAYOUTS */}
          <button style={btn} onClick={() => navigate("/payouts")}>
            💸 Payouts
          </button>

          {/* NEW: PENDING PAYOUTS */}
          <button style={btn} onClick={() => navigate("/payouts/pending")}>
            ⏳ Pending Payouts
          </button>

          {/* TRANSACTIONS */}
          <button style={btn} onClick={() => navigate("/transactions")}>
            🧾 Transactions
          </button>

          {/* RECONCILIATION */}
          <button style={btn} onClick={() => navigate("/reconciliation")}>
            📊 Reconciliation
          </button>

          {/* AUDIT */}
          <button style={btn} onClick={() => navigate("/audit")}>
            📜 Admin Audit Log
          </button>

          {/* LOGOUT */}
          <button
            style={{
              ...btn,
              backgroundColor: "#eee",
              color: "#333",
              marginTop: 10,
            }}
            onClick={logout}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   SHARED BUTTON STYLE
=============================== */
const btn = {
  padding: "12px 16px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  backgroundColor: "#5b1f75",
  color: "#fff",
  textAlign: "left",
};
