import { useEffect, useState } from "react";
import api from "../api";

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = async () => {
    try {
      const res = await api.get("/payouts");
      setPayouts(res.data);
    } catch (err) {
      console.error("Failed to fetch payouts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleRetry = async (payoutId) => {
    try {
      await api.post(`/payouts/${payoutId}/process`);
      fetchPayouts();
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(
        "Retry failed: " +
          (err.response?.data?.details || err.message)
      );
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "COMPLETED":
        return { background: "#16a34a", color: "#fff" };
      case "FAILED":
        return { background: "#dc2626", color: "#fff" };
      case "PROCESSING":
        return { background: "#f59e0b", color: "#000" };
      case "CREATED":
        return { background: "#3b82f6", color: "#fff" };
      default:
        return { background: "#6b7280", color: "#fff" };
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading payouts...</div>;
  }

  return (
    <div
      style={{
        padding: 20,
        background: "#0b132b",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h2 style={{ marginBottom: 20 }}>💸 Payouts</h2>

      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#1c2541", color: "#fff" }}>
            <tr>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Attempts</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Error</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: "center" }}>
                  No payouts found
                </td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.id} style={{ borderBottom: "1px solid #eee" }}>
                  {/* Amount */}
                  <td style={tdStyle}>
                    R{Number(payout.total_amount).toFixed(2)}
                  </td>

                  {/* Status */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        ...getStatusStyle(payout.status),
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {payout.status}
                    </span>
                  </td>

                  {/* Attempts */}
                  <td style={tdStyle}>
                    {payout.attempt_count || 0}
                  </td>

                  {/* Date */}
                  <td style={tdStyle}>
                    {new Date(payout.created_at).toLocaleString()}
                  </td>

                  {/* Error */}
                  <td style={{ ...tdStyle, maxWidth: 250 }}>
                    {payout.status === "FAILED" && payout.last_error ? (
                      <span style={{ color: "red", fontSize: 12 }}>
                        {payout.last_error}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  {/* Action */}
                  <td style={tdStyle}>
                    {payout.status === "FAILED" && (
                      <button
                        onClick={() => handleRetry(payout.id)}
                        style={{
                          background: "#facc15",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px",
  textAlign: "left",
  fontSize: 14,
};

const tdStyle = {
  padding: "12px",
  color: "#000",
};


