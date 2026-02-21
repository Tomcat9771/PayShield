import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import GoldButton from "../components/GoldButton";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) setLogs(data);
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading audit logs...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin Audit Log</h2>

      <GoldButton
        onClick={() => navigate("/admin/dashboard")}
        style={{ marginBottom: "25px" }}
      >
        ← Back to Dashboard
      </GoldButton>

      {logs.length === 0 && <p>No audit records found.</p>}

      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
            background: "#fff",
          }}
        >
          <p><strong>Action:</strong> {log.action}</p>
          <p><strong>Entity:</strong> {log.entity_type}</p>
          <p><strong>Admin:</strong> {log.admin_email}</p>
          <p><strong>Time:</strong> {new Date(log.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}