import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "./components/PageHeader";
import {
  listPayouts,
  confirmPayouts,
  approvePayout,
  processPayout,
  getPayout,
  retryPayout,
} from "./apiClient";

/* ===============================
   STATUS PILL
=============================== */
function StatusPill({ status }) {
  const map = {
    CREATED: "bg-gray-200 text-gray-800",
    APPROVED: "bg-blue-200 text-blue-800",
    PROCESSING: "bg-yellow-200 text-yellow-900",
    COMPLETED: "bg-green-200 text-green-800",
    PAID_OUT: "bg-green-200 text-green-800",
    FAILED: "bg-red-200 text-red-800",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        map[status] || "bg-gray-200 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}

/* ===============================
   ACTION BUTTON
=============================== */
function ActionButton({ label, allowed, onClick }) {
  return (
    <button
      disabled={!allowed}
      onClick={onClick}
      className={`px-3 py-1 rounded text-sm font-semibold mr-2
        ${
          allowed
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
    >
      {label}
    </button>
  );
}

export default function Payouts() {
  const navigate = useNavigate();
  const { id: payoutId } = useParams();

  const [payouts, setPayouts] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     LOADERS
  =============================== */
  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      setPayouts(await listPayouts());
    } catch {
      alert("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayoutDetail = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const res = await getPayout(id);

        const orderedTx = [...(res.transactions || [])].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        setSelectedPayout(res.payout);
        setTransactions(orderedTx);
      } catch {
        alert("Failed to load payout details");
        navigate("/payouts");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (payoutId) {
      loadPayoutDetail(payoutId);
    } else {
      setSelectedPayout(null);
      loadPayouts();
    }
  }, [payoutId, loadPayoutDetail, loadPayouts]);

  /* ===============================
     ACTIONS
  =============================== */
  async function handleConfirmPayouts() {
    setLoading(true);
    try {
      await confirmPayouts();
      await loadPayouts();
    } catch {
      alert("Failed to confirm payouts");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    await approvePayout(id);
    await loadPayoutDetail(id);
    await loadPayouts();
  }

  async function handleProcess(id) {
    try {
      await processPayout(id);
    } finally {
      await loadPayoutDetail(id);
      await loadPayouts();
    }
  }

  async function handleRetry(id) {
    await retryPayout(id);
    await loadPayoutDetail(id);
    await loadPayouts();
  }

  const attempts = transactions.map((t, index) => ({
    ...t,
    attempt: index + 1,
  }));

  /* ===============================
     RENDER
  =============================== */
  return (
    <div>
      {/* ===== HEADER ===== */}
      <PageHeader
        title={selectedPayout ? "Payout Details" : "Payouts"}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Payouts" },
        ]}
        showBack
      />

      {!selectedPayout && (
        <>
          {/* Confirm + Flow */}
          <div className="mb-6">
            <button
              onClick={handleConfirmPayouts}
              disabled={loading}
              className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800"
            >
              Confirm Payouts
            </button>

            <div className="mt-3 border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 max-w-xl">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Process Flow
              </div>
              <div className="text-sm text-gray-700">
                CREATED → APPROVED → PROCESSING → COMPLETED / FAILED
              </div>
            </div>
          </div>

          {loading && <p className="text-gray-500">Loading…</p>}

          {!loading && payouts.length === 0 && (
            <p className="text-gray-500">No payouts found.</p>
          )}

          {!loading && payouts.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="py-3 px-3 w-[360px] border-r">ID</th>
                    <th className="px-3 border-r">Guard</th>
                    <th className="px-3 text-right border-r">Amount</th>
                    <th className="px-3 border-r">Status</th>
                    <th className="px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-t hover:bg-gray-50 ${
                        p.status === "FAILED" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-sm break-all border-r">
                        {p.id}
                      </td>
                      <td className="px-3 border-r">{p.guard_name}</td>
                      <td className="px-3 text-right font-semibold border-r">
                        R {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-3 border-r">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-3">
                        <ActionButton
                          label="View"
                          allowed
                          onClick={() => navigate(`/payouts/${p.id}`)}
                        />
                        <ActionButton
                          label="Approve"
                          allowed={p.status === "CREATED"}
                          onClick={() => handleApprove(p.id)}
                        />
                        <ActionButton
                          label="Process"
                          allowed={p.status === "APPROVED"}
                          onClick={() => handleProcess(p.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedPayout && (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-600">Payout ID</p>
            <p className="font-mono break-all mb-2">{selectedPayout.id}</p>

            <div className="flex items-center gap-4">
              <StatusPill status={selectedPayout.status} />
              <span className="font-semibold">
                Total: R {Number(selectedPayout.amount).toFixed(2)}
              </span>
            </div>
          </div>

          {selectedPayout.status === "FAILED" && (
            <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
              <strong>Failure reason:</strong>{" "}
              {selectedPayout.failure_reason || "No reason recorded"}
              <div className="mt-3">
                <ActionButton label="Retry Payout" allowed onClick={() => handleRetry(selectedPayout.id)} />
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold mb-3">
            Transaction Attempts
          </h3>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="py-2 px-3 border-r">Attempt</th>
                  <th className="px-3 text-right border-r">Amount</th>
                  <th className="px-3 border-r">Status</th>
                  <th className="px-3 border-r">Provider</th>
                  <th className="px-3 border-r">Reference</th>
                  <th className="px-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2 border-r">#{t.attempt}</td>
                    <td className="px-3 text-right border-r">
                      R {Number(t.amount_net).toFixed(2)}
                    </td>
                    <td className="px-3 border-r">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-3 border-r">{t.provider || "—"}</td>
                    <td className="px-3 font-mono break-all border-r">
                      {t.provider_ref || "—"}
                    </td>
                    <td className="px-3">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
