import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "./apiClient";

export default function GuardHistory() {
  const navigate = useNavigate();
  const { id: guardId } = useParams();

  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [txRes, payoutRes] = await Promise.all([
          apiClient.get(`/transactions?guard_id=${guardId}`),
          apiClient.get(`/payouts?guard_id=${guardId}`),
        ]);

        setTransactions(txRes.data || []);
        setPayouts(payoutRes.data || []);
      } catch {
        alert("Failed to load guard history");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [guardId]);

  return (
    <div>
      {/* PAGE-LEVEL BREADCRUMB */}
      <div className="text-sm text-gray-500 mb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-purple-700 hover:underline"
        >
          Dashboard
        </button>
        <span className="mx-1">›</span>
        <button
          onClick={() => navigate("/guards")}
          className="text-purple-700 hover:underline"
        >
          Guards
        </button>
        <span className="mx-1">›</span>
        <span className="font-semibold text-gray-700">Guard History</span>
      </div>

      <h2 className="text-2xl font-semibold mb-1">Guard History</h2>
      <p className="text-sm text-gray-600 mb-6">
        <strong>Guard ID:</strong> {guardId}
      </p>

      {loading && <p>Loading…</p>}

      {!loading && (
        <>
          {/* ===============================
              TRANSACTIONS
          =============================== */}
          <h3 className="text-lg font-semibold mb-3">Transactions</h3>

          {transactions.length === 0 && (
            <p className="text-gray-500 mb-6">No transactions found.</p>
          )}

          {transactions.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Amount (Net)</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Payout ID</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        R {Number(t.amount_net).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{t.status}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {t.payout_id || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===============================
              PAYOUTS
          =============================== */}
          <h3 className="text-lg font-semibold mb-3">Payouts</h3>

          {payouts.length === 0 && (
            <p className="text-gray-500">No payouts found.</p>
          )}

          {payouts.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Provider Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        R {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{p.status}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => navigate(`/payouts/${p.id}`)}
                          className="text-purple-700 hover:underline font-mono text-xs"
                          title="View payout details"
                        >
                          {p.reference_code || p.id}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
