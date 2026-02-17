import { useEffect, useState } from "react";
import apiClient, { listTransactions } from "./apiClient";
import PageHeader from "./components/PageHeader";

function PeriodClosedBadge() {
  return (
    <span
      style={{
        background: "#6c757d",
        color: "white",
        padding: "3px 6px",
        borderRadius: "6px",
        fontSize: "11px",
        marginLeft: 6,
      }}
    >
      PERIOD CLOSED
    </span>
  );
}

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    payoutMethod: "",
  });

  const isAdmin = true;

  async function loadTransactions() {
    setLoading(true);
    try {
      const data = await listTransactions(filters);
      setTxs(data || []);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isPeriodClosed(createdAt) {
    const txDate = new Date(createdAt);
    const now = new Date();

    return (
      txDate.getFullYear() < now.getFullYear() ||
      (txDate.getFullYear() === now.getFullYear() &&
        txDate.getMonth() < now.getMonth())
    );
  }

  async function reverseTransaction(id) {
    if (!window.confirm("Reverse this transaction?")) return;
    await apiClient.post(`/transactions/${id}/reverse`);
    loadTransactions();
  }

  async function retryTransaction(id) {
    if (!window.confirm("Retry this transaction?")) return;
    await apiClient.post(`/transactions/${id}/retry`);
    loadTransactions();
  }

  return (
    <div className="max-w-6xl mx-auto mt-10">
      {/* PAGE HEADER */}
      <PageHeader
        title="Transactions"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Transactions" },
        ]}
        showBack
      />

      <div className="bg-white rounded-2xl shadow-xl p-6">
        {/* FILTERS */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <option value="">All Statuses</option>
            <option value="COMPLETE">COMPLETE</option>
            <option value="PAID_OUT">PAID_OUT</option>
            <option value="RETRY">RETRY</option>
            <option value="REVERSAL">REVERSAL</option>
          </select>

          <select
            value={filters.payoutMethod}
            onChange={(e) =>
              setFilters({ ...filters, payoutMethod: e.target.value })
            }
          >
            <option value="">All Payout Methods</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>

          <button
            className="bg-purple-700 text-white px-4 py-2 rounded"
            onClick={loadTransactions}
          >
            Apply Filters
          </button>
        </div>

        {/* TABLE */}
        {loading ? (
          <p className="text-gray-500">Loading transactions…</p>
        ) : txs.length === 0 ? (
          <p className="text-gray-500">No transactions found.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table
              style={{
                width: "100%",
                minWidth: 1100,
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead style={{ background: "#f9fafb" }}>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Guard</th>
                  <th style={th}>Gross</th>
                  <th style={th}>Commission</th>
                  <th style={th}>Net</th>
                  <th style={th}>Status</th>
                  <th style={th}>Payout</th>
                  <th style={th}>Provider</th>
                  <th style={th}>Reference</th>
                  {isAdmin && <th style={th}>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {txs.map((t) => {
                  const closed = isPeriodClosed(t.created_at);

                  return (
                    <tr key={t.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={td}>
                        {new Date(t.created_at).toLocaleString()}
                        {closed && <PeriodClosedBadge />}
                      </td>
                      <td style={td}>{t.guard_name}</td>
                      <td style={td}>
                        R {Number(t.amount_gross).toFixed(2)}
                      </td>
                      <td style={td}>
                        R {Number(t.commission_amount).toFixed(2)}
                      </td>
                      <td style={td}>
                        R {Number(t.amount_net).toFixed(2)}
                      </td>
                      <td style={td}>{t.status}</td>
                      <td style={td}>{t.payout_method}</td>
                      <td style={td}>{t.provider_ref}</td>

                      {isAdmin && (
                        <td style={td}>
                          <button
                            disabled={closed}
                            onClick={() => retryTransaction(t.id)}
                            style={actionPurple}
                          >
                            Retry
                          </button>

                          <span style={divider} />

                          <button
                            disabled={closed}
                            onClick={() => reverseTransaction(t.id)}
                            style={actionRed}
                          >
                            Reverse
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================
   STYLES
=============================== */
const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "10px 12px",
  verticalAlign: "top",
};

const actionPurple = {
  color: "#4b2aad",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const actionRed = {
  color: "#c0392b",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const divider = {
  margin: "0 8px",
  borderLeft: "1px solid #ddd",
  height: 14,
  display: "inline-block",
};
