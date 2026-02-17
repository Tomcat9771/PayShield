import { useEffect, useMemo, useState } from "react";
import api from "./apiClient";
import PageHeader from "./components/PageHeader";

/* ===============================
   SUMMARY CARD
=============================== */
function SummaryCard({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 min-w-[160px]">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

export default function PendingPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | TODAY | OVERDUE
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  async function loadPayouts() {
    try {
      setLoading(true);

      const [payoutRes, summaryRes] = await Promise.all([
        api.get("/payouts/pending"),
        api.get("/payouts/pending/summary"),
      ]);

      setPayouts(payoutRes.data.payouts || []);
      setSummary(summaryRes.data);
    } catch {
      setError("Failed to load pending payouts");
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted(payoutId) {
    if (!window.confirm("Confirm that this payout has been completed?")) return;

    try {
      setProcessingId(payoutId);
      await api.post(`/payouts/${payoutId}/complete`);
      await loadPayouts();
    } catch {
      alert("Failed to mark payout as completed");
    } finally {
      setProcessingId(null);
    }
  }

  function daysPending(date) {
    const diff =
      (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(diff));
  }

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const date = p.payout_date.slice(0, 10);
      const matchesSearch = p.guard_name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filter === "TODAY") return date === today;
      if (filter === "OVERDUE") return date < today;
      return true;
    });
  }, [payouts, filter, search, today]);

  useEffect(() => {
    loadPayouts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10">
      {/* PAGE HEADER */}
      <PageHeader
        title="Pending Payouts"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Pending Payouts" },
        ]}
        showBack
      />

      <div className="bg-white rounded-2xl shadow-xl p-6">
        {loading && (
          <p className="text-gray-500">Loading pending payouts…</p>
        )}

        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {/* SUMMARY */}
            {summary && (
              <div className="flex flex-wrap gap-4 mb-6">
                <SummaryCard
                  label="Pending"
                  value={summary.totalCount}
                />
                <SummaryCard
                  label="Total"
                  value={`R ${summary.totalAmount.toFixed(2)}`}
                />
                <SummaryCard
                  label="Overdue"
                  value={summary.overdueCount}
                />
              </div>
            )}

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                className={
                  filter === "ALL"
                    ? "bg-purple-700 text-white px-4 py-2 rounded"
                    : "bg-gray-100 px-4 py-2 rounded"
                }
                onClick={() => setFilter("ALL")}
              >
                All
              </button>

              <button
                className={
                  filter === "TODAY"
                    ? "bg-purple-700 text-white px-4 py-2 rounded"
                    : "bg-gray-100 px-4 py-2 rounded"
                }
                onClick={() => setFilter("TODAY")}
              >
                Today
              </button>

              <button
                className={
                  filter === "OVERDUE"
                    ? "bg-purple-700 text-white px-4 py-2 rounded"
                    : "bg-gray-100 px-4 py-2 rounded"
                }
                onClick={() => setFilter("OVERDUE")}
              >
                Overdue
              </button>

              <input
                className="border border-gray-300 rounded px-3 py-2"
                placeholder="Search guard…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* TABLE / EMPTY */}
            {filteredPayouts.length === 0 ? (
              <p className="text-gray-500">No pending payouts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={th}>Guard</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Date</th>
                      <th className={th}>Days Pending</th>
                      <th className={th}>Status</th>
                      <th className={th}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayouts.map((p) => {
                      const date = p.payout_date.slice(0, 10);
                      const overdue = date < today;

                      return (
                        <tr
                          key={p.id}
                          className={overdue ? "bg-yellow-50" : ""}
                        >
                          <td className={td}>{p.guard_name}</td>
                          <td className={td}>
                            R {Number(p.amount).toFixed(2)}
                          </td>
                          <td className={td}>{date}</td>
                          <td className={td}>
                            {daysPending(p.payout_date)}
                          </td>
                          <td className={td}>{p.status}</td>
                          <td className={td}>
                            <button
                              className="bg-purple-700 text-white px-3 py-2 rounded"
                              onClick={() => markCompleted(p.id)}
                              disabled={processingId === p.id}
                            >
                              {processingId === p.id
                                ? "Processing…"
                                : "✔ Completed"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
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
  "px-4 py-3 text-gray-800";
