import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { saveGuardBankDetails } from "./apiClient";
import PageHeader from "./components/PageHeader";

export default function AddGuard() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    id_type: "",
    id_number: "",
    phone: "",
    site_location: "",
    payout_method: "",

    street_address: "",
    suburb: "",
    city: "",
    postal_code: "",
    province: "",

    bank_name: "",
    account_holder: "",
    account_number: "",
    branch_code: "",
    account_type: "",
  });

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // ✅ FRONTEND VALIDATION
    if (!form.full_name || !form.phone) {
      setMessage("Full name and phone number are required");
      setLoading(false);
      return;
    }

    if (!form.id_type) {
      setMessage("Please select an ID type");
      setLoading(false);
      return;
    }

    if (!form.site_location.trim()) {
      setMessage("Site / Location is required");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone_number: form.phone.trim(),

        id_type: form.id_type,
        id_number: form.id_number.trim(),

        site_location: form.site_location.trim(), // accepts letters, numbers & symbols
        payout_method: form.payout_method || "cash",

        street_address: form.street_address.trim(),
        suburb: form.suburb.trim() || null,
        city: form.city.trim(),
        postal_code: form.postal_code.trim() || null,
        province: form.province,
      };

      const res = await apiClient.post("/guards", payload);
      const guard = res.data;

      if (form.payout_method === "bank") {
        await saveGuardBankDetails(guard.id, {
          bank_name: form.bank_name.trim(),
          account_holder: form.account_holder.trim(),
          account_number: form.account_number.trim(),
          branch_code: form.branch_code.trim(),
          account_type: form.account_type,
        });
      }

      navigate("/guards");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.error || "Failed to add guard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <PageHeader
        title="Add Guard"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Add Guard" },
        ]}
        showBack
      />

      <div className="modal-card">
        {message && (
          <p style={{ color: "#a94442", marginBottom: 12 }}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* PERSONAL */}
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
            name="phone"
            value={form.phone}
            onChange={updateField}
            required
          />

          <hr />

          {/* SITE / LOCATION */}
          <label>Site / Location</label>
          <input
            name="site_location"
            value={form.site_location}
            onChange={updateField}
            placeholder="e.g. Westgate Mall – Level B #23"
            required
          />

          <hr />

          {/* ADDRESS */}
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

          {/* ✅ POSTAL CODE MOVED HERE */}
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

          <label>Payout method</label>
          <select
            name="payout_method"
            value={form.payout_method}
            onChange={updateField}
            required
          >
            <option value="">Select payout method</option>
            <option value="bank">EFT</option>
            <option value="cash">Send Cash</option>
          </select>

          {/* BANK DETAILS */}
          {form.payout_method === "bank" && (
            <>
              <hr />
              <label>Bank name</label>
              <input
                name="bank_name"
                value={form.bank_name}
                onChange={updateField}
                required
              />

              <label>Account holder</label>
              <input
                name="account_holder"
                value={form.account_holder}
                onChange={updateField}
                required
              />

              <label>Account number</label>
              <input
                name="account_number"
                value={form.account_number}
                onChange={updateField}
                required
              />

              <label>Branch code</label>
              <input
                name="branch_code"
                value={form.branch_code}
                onChange={updateField}
                required
              />

              <label>Account type</label>
              <select
                name="account_type"
                value={form.account_type}
                onChange={updateField}
                required
              >
                <option value="">Select account type</option>
                <option value="savings">Savings</option>
                <option value="cheque">Cheque</option>
              </select>
            </>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="modal-primary"
              disabled={loading}
            >
              {loading ? "Saving…" : "Add Guard"}
            </button>

            <button
              type="button"
              className="modal-secondary"
              onClick={() => navigate("/guards")}
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
