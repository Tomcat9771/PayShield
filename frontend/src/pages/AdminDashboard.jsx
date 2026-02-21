import { useNavigate } from "react-router-dom";
import { layout, typography } from "../theme";
import GoldButton from "../components/GoldButton";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={layout.contentWrapper}>
      <h1 style={typography.heading}>Admin Dashboard</h1>

      <div
        style={{
          width: "80px",
          height: "3px",
          background: "linear-gradient(to right, #F1C50E, transparent)",
          marginBottom: "30px",
        }}
      />

      <p style={typography.text}>Welcome, Admin.</p>

      <div style={{ marginTop: 30, display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <GoldButton onClick={() => navigate("/admin/registrations")}>
          View Registrations
        </GoldButton>

        <GoldButton onClick={() => navigate("/admin/documents")}>
          Review Documents
        </GoldButton>

        <GoldButton onClick={() => navigate("/admin/audit-log")}>
          Audit Log
        </GoldButton>
      </div>
    </div>
  );
}