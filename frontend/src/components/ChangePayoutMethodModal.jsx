import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../apiClient";

export default function ChangePayoutMethodModal({ guard, onClose, onUpdated }) {
  const [method, setMethod] = useState(guard.payout_method);
  const [saving, setSaving] = useState(false);

  async function submit() {
    try {
      setSaving(true);
      await api.post(`/guards/${guard.id}/change-payout-method`, {
        payout_method: method,
      });
      onUpdated();
      onClose();
    } catch {
      alert("Failed to change payout method");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Change payout method</h3>

        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Current payout method:{" "}
          <strong>{guard.payout_method}</strong>
        </p>

        <label>New payout method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </select>

        {guard.payout_method === "cash" && method === "bank" && (
          <p
            style={{
              fontSize: 13,
              color: "#a15c00",
              marginTop: 12,
            }}
          >
            ⚠ Switching to bank payout will require bank details to be
            added and verified before payouts can resume.
          </p>
        )}

        {guard.payout_method === "bank" && method === "cash" && (
          <p
            style={{
              fontSize: 13,
              color: "#555",
              marginTop: 12,
            }}
          >
            Bank details will be retained but payouts will be made in cash.
          </p>
        )}

        <div className="modal-actions">
          <button
            className="modal-primary"
            onClick={submit}
            disabled={saving || method === guard.payout_method}
          >
            {saving ? "Saving…" : "Confirm"}
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
