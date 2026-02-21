export default function AdminDashboard() {
  const linkStyle = {
    display: "inline-block",
    marginTop: "15px",
    padding: "10px 24px",
    backgroundColor: "#FAE418",
    border: "2px solid #F1C50E",
    color: "#6B1A7B",
    borderRadius: "30px",
    fontWeight: "bold",
    textDecoration: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ color: "#F1C50E" }}>Admin Dashboard</h1>
      <p style={{ color: "white" }}>Welcome, Admin.</p>

      <div style={{ marginTop: 30 }}>
        <a href="/admin/registrations" style={linkStyle}>
          View Registrations
        </a>
      </div>

      <div>
        <a href="/admin/documents" style={linkStyle}>
          Review Documents
        </a>
      </div>

      <div>
        <a href="/admin/audit-log" style={linkStyle}>
          Audit Log
        </a>
      </div>
    </div>
  );
}