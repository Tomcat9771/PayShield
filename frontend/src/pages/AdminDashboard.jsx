export default function AdminDashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome, Admin.</p>

      <div style={{ marginTop: 20 }}>
        <a href="/admin/registrations">View Registrations</a>
      </div>

      <div style={{ marginTop: 10 }}>
        <a href="/admin/documents">Review Documents</a>
      </div>

      <div style={{ marginTop: 10 }}>
        <a href="/admin/audit-log">Audit Log</a>
      </div>
    </div>
  );
}