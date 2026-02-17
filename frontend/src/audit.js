import { useEffect, useState } from "react";
import api from "./apiClient";
import PageHeader from "./components/PageHeader";

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  async function loadAudit() {
    try {
      const res = await api.get("/audit");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Failed to load audit log", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto mt-10">
      {/* PAGE HEADER */}
      <PageHeader
        title="Admin Audit Log"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Admin Audit Log" },
        ]}
        showBack
      />

      <div className="bg-white rounded-2xl shadow-xl p-6">
        {loading && <p className="text-gray-500">Loading audit log…</p>}

        {!loading && logs.length === 0 && (
          <p className="text-gray-500">No audit events recorded.</p>
        )}

        {!loading && logs.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className={th}>Time</th>
                  <th className={th}>Admin</th>
                  <th className={th}>Action</th>
                  <th className={th}>Entity</th>
                  <th className={th}>Entity ID</th>
                  <th className={th}>Metadata</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className={td}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className={td}>{log.admin_id || "System"}</td>
                    <td className={td}>
                      <span className="font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className={td}>{log.entity_type || "—"}</td>
                    <td className={`${td} font-mono`}>
                      {log.entity_id || "—"}
                    </td>
                    <td className={td}>
                      {log.metadata ? (
                        <pre className="bg-gray-100 rounded-lg p-2 text-xs max-w-[420px] overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================
   TABLE STYLES
=============================== */
const th =
  "text-left px-4 py-3 font-semibold text-gray-700 border-b";

const td =
  "px-4 py-3 text-gray-800 whitespace-normal";
