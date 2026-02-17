import { useState } from "react";
import apiClient from "./apiClient";
import PageHeader from "./components/PageHeader";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===============================
   SUMMARY CARD
=============================== */
function SummaryCard({ label, value, color }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 min-w-[180px]">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className="text-xl font-semibold"
        style={{ color: color || "#111" }}
      >
        {value}
      </div>
    </div>
  );
}

/* ===============================
   HELPERS
=============================== */
function buildFilename(prefix, start, end, ext) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}_${start}_to_${end}_${ts}.${ext}`;
}

function downloadCSV(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${row[h] ?? ""}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===============================
   EXCEL EXPORT
=============================== */
function exportExcel({
  start,
  end,
  completedTx,
  completedPayouts,
  txTotal,
  payoutTotal,
  difference,
}) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        "Start Date": start,
        "End Date": end,
        "Completed Transactions": completedTx.length,
        "Total Net": txTotal.toFixed(2),
        "Completed Payouts": payoutTotal.toFixed(2),
        Difference: difference.toFixed(2),
      },
    ]),
    "Summary"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      completedTx.map((t) => ({
        Date: new Date(t.created_at).toLocaleDateString(),
        Guard: t.guard_name,
        "Net Amount": Number(t.amount_net).toFixed(2),
        Status: t.status,
      }))
    ),
    "Transactions"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      completedPayouts.map((p) => ({
        Date: new Date(p.created_at).toLocaleDateString(),
        Guard: p.guard_name,
        Amount: Number(p.amount).toFixed(2),
        Status: p.status,
      }))
    ),
    "Payouts"
  );

  XLSX.writeFile(
    wb,
    buildFilename("reconciliation", start, end, "xlsx")
  );
}

/* ===============================
   PDF EXPORT
=============================== */
function exportPDF({
  start,
  end,
  completedTx,
  completedPayouts,
  txTotal,
  payoutTotal,
  difference,
}) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Reconciliation Report", 14, 15);

  doc.setFontSize(10);
  doc.text(`Period: ${start} to ${end}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Metric", "Value"]],
    body: [
      ["Completed Transactions", completedTx.length],
      ["Total Net", `R ${txTotal.toFixed(2)}`],
      ["Completed Payouts", `R ${payoutTotal.toFixed(2)}`],
      ["Difference", `R ${difference.toFixed(2)}`],
    ],
  });

  doc.save(buildFilename("reconciliation", start, end, "pdf"));
}

/* ===============================
   MAIN COMPONENT
=============================== */
export default function Reconciliation() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!start || !end) {
      setError("Please select both start and end dates.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await apiClient.get(
        `/transactions/reconciliation?start=${start}&end=${end}`
      );
      setData(res.data);
    } catch {
      setError("Failed to run reconciliation");
    } finally {
      setLoading(false);
    }
  }

  const transactions = data?.transactions || [];
  const payouts = data?.payouts || [];

  const completedTx = transactions.filter((t) => t.status === "COMPLETE");
  const completedPayouts = payouts.filter((p) => p.status === "COMPLETED");

  const txTotal = completedTx.reduce(
    (s, t) => s + Number(t.amount_net || 0),
    0
  );
  const payoutTotal = completedPayouts.reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );
  const difference = txTotal - payoutTotal;

  return (
    <div className="max-w-5xl mx-auto mt-10">
      {/* Page Header */}
      <PageHeader
        title="Reconciliation"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Reconciliation" },
        ]}
        showBack
      />

      <div className="bg-white rounded-2xl shadow-xl p-6">
        {/* DATE RANGE */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <button
            onClick={run}
            className="bg-purple-700 text-white px-4 py-2 rounded"
          >
            Run
          </button>
        </div>

        {loading && <p className="text-gray-500">Running reconciliation…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {data && (
          <>
            {/* SUMMARY */}
            <div className="flex flex-wrap gap-4 mb-6">
              <SummaryCard
                label="Transactions (Completed)"
                value={completedTx.length}
              />
              <SummaryCard
                label="Total Net"
                value={`R ${txTotal.toFixed(2)}`}
              />
              <SummaryCard
                label="Payouts (Completed)"
                value={`R ${payoutTotal.toFixed(2)}`}
              />
              <SummaryCard
                label="Difference"
                value={`R ${difference.toFixed(2)}`}
                color={difference === 0 ? "#16a34a" : "#dc2626"}
              />
            </div>

            {/* EXPORTS */}
            <div className="flex flex-wrap gap-3">
              <button
                className="bg-gray-100 px-3 py-2 rounded"
                onClick={() =>
                  exportExcel({
                    start,
                    end,
                    completedTx,
                    completedPayouts,
                    txTotal,
                    payoutTotal,
                    difference,
                  })
                }
              >
                Export Excel
              </button>

              <button
                className="bg-gray-100 px-3 py-2 rounded"
                onClick={() =>
                  downloadCSV(
                    buildFilename(
                      "reconciliation-transactions",
                      start,
                      end,
                      "csv"
                    ),
                    completedTx
                  )
                }
              >
                Export Transactions CSV
              </button>

               <button
                className="bg-gray-100 px-3 py-2 rounded"
                onClick={() =>
                  exportPDF({
                    start,
                    end,
                    completedTx,
                    completedPayouts,
                    txTotal,
                    payoutTotal,
                    difference,
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
