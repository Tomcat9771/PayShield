import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../apiClient";

export default function BankDetailsModal({ guard, onClose, onSaved }) {
  const [form, setForm] = useState({
    bank_name: guard.bank_name || "",
    account_holder: guard.account_holder || "",
    account_number: "",
    branch_code: "",
    account_type: guard.account_type || "cheque",
  });

  const [saving, setSaving] = useState(false);

  async function save() {
    try {
      setSaving(true);
      await api.put(`/guards/${guard.id}/bank-details`, form);
      onSaved();
      onClose();
    } catch {
      alert("Failed to save bank details");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Bank details</h3>

        <p style={{ fontSize: 13, color: "#a15c00", marginBottom: 12 }}>
          ⚠ Updating bank details will require re-verification before payouts can resume.
        </p>

        <label>Bank name</label>
        <input
          value={form.bank_name}
          onChange={(e) =>
            setForm({ ...form, bank_name: e.target.value })
          }
        />

        <label>Account holder</label>
        <input
          value={form.account_holder}
          onChange={(e) =>
            setForm({ ...form, account_holder: e.target.value })
          }
        />

        <label>Account number</label>
        <input
          placeholder="Enter full account number"
          value={form.account_number}
          onChange={(e) =>
            setForm({ ...form, account_number: e.target.value })
          }
        />
        <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          For security reasons, the full account number is not displayed.
        </p>

        <label>Branch code</label>
        <input
          placeholder="e.g. 000001"
          value={form.branch_code}
          onChange={(e) =>
            setForm({ ...form, branch_code: e.target.value })
          }
        />

        <label>Account type</label>
        <select
          value={form.account_type}
          onChange={(e) =>
            setForm({ ...form, account_type: e.target.value })
          }
        >
          <option value="cheque">Cheque</option>
          <option value="savings">Savings</option>
          <option value="transmission">Transmission</option>
        </select>

        <div className="modal-actions">
          <button
            className="modal-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            className="modal-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
}
