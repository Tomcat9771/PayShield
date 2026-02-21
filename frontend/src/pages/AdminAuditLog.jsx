import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import GoldButton from "../components/GoldButton";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
const navigate = useNavigate();
<GoldButton
  onClick={() => navigate("/admin/dashboard")}
  style={{ marginBottom: "20px" }}
>
  ← Back to Dashboard
</GoldButton>

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) {
      setLogs(data);
    } else {
      console.error(error);
    }

    setLoading(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading audit logs...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Audit Log</h2>

      {logs.length === 0 && <p>No audit records found.</p>}

      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
            background: "#fff"
          }}
        >
          <p>
            <strong>Action:</strong> {log.action}
          </p>

          <p>
            <strong>Entity:</strong> {log.entity_type}
          </p>

          <p>
            <strong>Admin:</strong> {log.admin_email}
          </p>

          <p>
            <strong>Time:</strong>{" "}
            {new Date(log.created_at).toLocaleString()}
          </p>

          {log.entity_id && (
            <p>
              <strong>Entity ID:</strong> {log.entity_id}
            </p>
          )}

          {log.metadata && (
            <div style={{ marginTop: 10 }}>
              <strong>Metadata:</strong>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "6px",
                  overflowX: "auto"
                }}
              >
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
