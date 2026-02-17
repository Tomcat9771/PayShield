import { useState, useEffect } from "react";
import apiClient from "../apiClient";

export default function EditGuardModal({ guard, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    id_type: "",
    id_number: "",
    site_location: "",
    street_address: "",
    suburb: "",
    city: "",
    postal_code: "",
    province: "",
  });

  // 🔑 CRITICAL FIX: sync form when guard changes
  useEffect(() => {
    if (!guard) return;

    setForm({
      full_name: guard.full_name ?? "",
      phone_number: guard.phone_number ?? "",

      id_type: guard.id_type ?? "",
      id_number: guard.id_number ?? "",

      site_location: guard.site_location ?? "",

      street_address: guard.street_address ?? "",
      suburb: guard.suburb ?? "",
      city: guard.city ?? "",
      postal_code: guard.postal_code ?? "",
      province: guard.province ?? "",
    });
  }, [guard]);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!form.full_name || !form.phone_number) {
      setError("Full name and phone number are required");
      setLoading(false);
      return;
    }

    if (!form.id_type || !form.id_number) {
      setError("ID type and ID number are required");
      setLoading(false);
      return;
    }

    if (!form.site_location.trim()) {
      setError("Site / Location is required");
      setLoading(false);
      return;
    }

    try {
      await apiClient.put(`/guards/${guard.id}`, {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),

        id_type: form.id_type,
        id_number: form.id_number.trim(),

        site_location: form.site_location.trim(),

        street_address: form.street_address.trim(),
        suburb: form.suburb.trim() || null,
        city: form.city.trim(),
        postal_code: form.postal_code.trim() || null,
        province: form.province,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to update guard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Edit Guard</h3>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSave}>
          <label>Full name</label>
          <input
            name="full_name"
            value={form.full_name}
            onChange={updateField}
            required
          />

          <label>ID type</label>
          <select
            name="id_type"
            value={form.id_type}
            onChange={updateField}
            required
          >
            <option value="">Select ID type</option>
            <option value="ID">South African ID</option>
            <option value="PASSPORT">Passport</option>
          </select>

          <label>ID / Passport number</label>
          <input
            name="id_number"
            value={form.id_number}
            onChange={updateField}
            required
          />

          <label>Phone number</label>
          <input
            name="phone_number"
            value={form.phone_number}
            onChange={updateField}
            required
          />

          <hr />

          <label>Site / Location</label>
          <input
            name="site_location"
            value={form.site_location}
            onChange={updateField}
            required
          />

          <hr />

          <label>Street address</label>
          <input
            name="street_address"
            value={form.street_address}
            onChange={updateField}
            required
          />

          <label>Suburb / Area</label>
          <input
            name="suburb"
            value={form.suburb}
            onChange={updateField}
          />

          <label>City / Town</label>
          <input
            name="city"
            value={form.city}
            onChange={updateField}
            required
          />

          <label>Postal code (optional)</label>
          <input
            name="postal_code"
            value={form.postal_code}
            onChange={updateField}
          />

          <label>Province</label>
          <select
            name="province"
            value={form.province}
            onChange={updateField}
            required
          >
            <option value="">Select Province</option>
            <option value="Gauteng">Gauteng</option>
            <option value="Western Cape">Western Cape</option>
            <option value="KwaZulu-Natal">KwaZulu-Natal</option>
            <option value="Eastern Cape">Eastern Cape</option>
            <option value="Free State">Free State</option>
            <option value="Limpopo">Limpopo</option>
            <option value="Mpumalanga">Mpumalanga</option>
            <option value="North West">North West</option>
            <option value="Northern Cape">Northern Cape</option>
          </select>

          <div className="modal-actions">
            <button type="submit" className="modal-primary" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </button>

            <button
              type="button"
              className="modal-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
