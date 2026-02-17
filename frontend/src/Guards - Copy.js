import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { updateGuard, saveGuardBankDetails } from "./apiClient";
import Breadcrumb from "./components/Breadcrumb";

export default function Guards() {
  const [guards, setGuards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [bankForm, setBankForm] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadGuards();
  }, []);

  async function loadGuards() {
    const res = await api.get("/guards/bank-status");
    setGuards(res.data);
  }

  function startEdit(guard) {
    setEditingId(guard.id);

    setForm({
      full_name: guard.full_name,
      phone_number: guard.phone_number,
      site_location: guard.site_location,
      status: guard.status,
      payout_method:
        guard.bank_status === "not_required" ? "cash" : "bank",
      street_address: guard.street_address || "",
      suburb: guard.suburb || "",
      city: guard.city || "",
      province: guard.province || "",
      postal_code: guard.postal_code || "",
    });

    setBankForm({
      bank_name: guard.bank_name || "",
      account_holder: guard.account_holder || "",
      account_number: guard.account_number || "",
      branch_code: guard.branch_code || "",
      account_type: guard.account_type || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
    setBankForm({});
  }

  async function saveEdit(id) {
    await updateGuard(id, {
      full_name: form.full_name,
      phone_number: form.phone_number,
      site_location: form.site_location,
      status: form.status,
      payout_method: form.payout_method,
      street_address: form.street_address,
      suburb: form.suburb,
      city: form.city,
      province: form.province,
      postal_code: form.postal_code,
    });

    if (
      form.payout_method === "bank" &&
      !guards.find((g) => g.id === id)?.bank_verified
    ) {
      await saveGuardBankDetails(id, bankForm);
    }

    setEditingId(null);
    loadGuards();
  }

  async function verifyBank(guardId) {
    if (!window.confirm("Verify this guard's bank details?")) return;
    await api.post(`/guards/${guardId}/verify-bank`);
    loadGuards();
  }

  async function unverifyBank(guardId) {
    if (!window.confirm("Mark this guard's bank details as unverified?")) return;
    await api.post(`/guards/${guardId}/unverify-bank`);
    loadGuards();
  }

  function renderBankStatus(guard) {
    if (guard.bank_status === "not_required") {
      return <span style={{ color: "#666", fontWeight: 500 }}>Cash payout</span>;
    }

    if (guard.bank_status === "valid" && guard.bank_verified) {
      return (
        <>
          <span style={{ color: "green", fontWeight: 600 }}>✔ Bank verified</span>
          <button onClick={() => unverifyBank(guard.id)} style={{ marginLeft: 12 }}>
            Unverify
          </button>
        </>
      );
    }

    return (
      <>
        <span style={{ color: "#d97706", fontWeight: 600 }}>
          ⏳ Bank unverified
        </span>
        <button onClick={() => verifyBank(guard.id)} style={{ marginLeft: 12 }}>
          Verify
        </button>
      </>
    );
  }

  function renderBankDetails(guard) {
    if (guard.bank_status === "not_required") return null;

    return (
      <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6 }}>
        <div><strong>Bank:</strong> {guard.bank_name}</div>
        <div><strong>Account Holder:</strong> {guard.account_holder}</div>
        <div><strong>Account Type:</strong> {guard.account_type || "—"}</div>
        <div><strong>Branch Code:</strong> {guard.branch_code}</div>
        <div><strong>Account Number:</strong> ****{String(guard.account_number).slice(-4)}</div>
      </div>
    );
  }

  function renderAddress(guard) {
    if (!guard.street_address && !guard.city) return null;

    return (
      <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Address</div>
        <div>{guard.street_address}</div>
        {guard.suburb && <div>{guard.suburb}</div>}
        <div>{guard.city}, {guard.province}</div>
        {guard.postal_code && <div>{guard.postal_code}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <Breadcrumb items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Guards" }]} />
      <h2 style={{ marginBottom: 24 }}>Guards</h2>

      {guards.map((g) => {
        const isEditing = editingId === g.id;

        return (
          <div
            key={g.id}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {!isEditing ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{g.full_name}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{g.site_location}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: g.status === "active" ? "green" : "red" }}>
                    {g.status}
                  </div>
                </div>

                {renderAddress(g)}
                <div style={{ marginTop: 10 }}>{renderBankStatus(g)}</div>
                {renderBankDetails(g)}

                <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                  <button onClick={() => startEdit(g)}>Edit</button>
                  <button onClick={() => navigate(`/guards/${g.id}/history`)}>History</button>
                </div>
              </>
            ) : (
              <>
                <h4>Edit Guard</h4>

                <div style={{ background: "#fafafa", padding: 16, borderRadius: 6 }}>

  {/* BASIC DETAILS */}
  <input
    placeholder="Full Name"
    value={form.full_name}
    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
  />

  <input
    placeholder="Phone Number"
    value={form.phone_number}
    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
  />

  <input
    placeholder="Site Location"
    value={form.site_location}
    onChange={(e) => setForm({ ...form, site_location: e.target.value })}
  />

  <select
    value={form.payout_method}
    onChange={(e) => setForm({ ...form, payout_method: e.target.value })}
  >
    <option value="cash">Cash payout</option>
    <option value="bank">Bank payout</option>
  </select>

  {/* ADDRESS — ALWAYS VISIBLE */}
  <h4 style={{ marginTop: 20 }}>Address</h4>

  <input
    placeholder="Street Address"
    value={form.street_address}
    onChange={(e) =>
      setForm({ ...form, street_address: e.target.value })
    }
  />

  <input
    placeholder="Suburb / Area"
    value={form.suburb}
    onChange={(e) =>
      setForm({ ...form, suburb: e.target.value })
    }
  />

  <input
    placeholder="City"
    value={form.city}
    onChange={(e) =>
      setForm({ ...form, city: e.target.value })
    }
  />

  <input
    placeholder="Province"
    value={form.province}
    onChange={(e) =>
      setForm({ ...form, province: e.target.value })
    }
  />

  <input
    placeholder="Postal Code"
    value={form.postal_code}
    onChange={(e) =>
      setForm({ ...form, postal_code: e.target.value })
    }
  />

  {/* BANK DETAILS — CONDITIONAL */}
  {form.payout_method === "bank" && (
    <>
      <h4 style={{ marginTop: 20 }}>Bank Details</h4>

      <input
        placeholder="Bank Name"
        value={bankForm.bank_name}
        disabled={g.bank_verified}
        onChange={(e) =>
          setBankForm({ ...bankForm, bank_name: e.target.value })
        }
      />

      <input
        placeholder="Account Holder"
        value={bankForm.account_holder}
        disabled={g.bank_verified}
        onChange={(e) =>
          setBankForm({ ...bankForm, account_holder: e.target.value })
        }
      />

      <input
        placeholder="Account Number"
        value={bankForm.account_number}
        disabled={g.bank_verified}
        onChange={(e) =>
          setBankForm({ ...bankForm, account_number: e.target.value })
        }
      />

      <input
        placeholder="Branch Code"
        value={bankForm.branch_code}
        disabled={g.bank_verified}
        onChange={(e) =>
          setBankForm({ ...bankForm, branch_code: e.target.value })
        }
      />

      <input
        placeholder="Account Type"
        value={bankForm.account_type}
        disabled={g.bank_verified}
        onChange={(e) =>
          setBankForm({ ...bankForm, account_type: e.target.value })
        }
      />
    </>
  )}

  {/* ACTIONS */}
  <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
    <button
      type="button"
      onClick={() => saveEdit(g.id)}
      style={{ background: "#4f46e5", color: "#fff" }}
    >
      Save
    </button>

    <button type="button" onClick={cancelEdit}>
      Cancel
    </button>
  </div>
</div>

              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
