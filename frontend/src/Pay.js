import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGuard } from "./apiClient";

export default function Pay() {
  const { guardId } = useParams();

  const [guard, setGuard] = useState(null);
  const [amount, setAmount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGuard() {
      try {
        const data = await getGuard(guardId);
        setGuard(data);
      } catch (err) {
        setError("Failed to load guard");
      }
    }
    loadGuard();
  }, [guardId]);
useEffect(() => {
  console.log("Pay page guardId:", guardId);
}, [guardId]);


  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/payfast/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guard_id: guard.id,
          amount,
          payout_method: "EFT",
        }),
      });

      const data = await res.json();

      if (!data.action || !data.fields) {
        throw new Error("Invalid PayFast response");
      }

      // Build and submit PayFast form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.action;

      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error(err);
      setError("Unable to start payment");
      setLoading(false);
    }
  }

  if (!guard) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", textAlign: "center" }}>
      <h2>Support this guard</h2>

      <div style={{ padding: 16, border: "1px solid #ddd", marginBottom: 16 }}>
        <strong>{guard.full_name}</strong>
        <div>{guard.site_location}</div>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        {[10, 20, 50, 100].map(v => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            style={{
              margin: 4,
              padding: "8px 16px",
              background: amount === v ? "#000" : "#fff",
              color: amount === v ? "#fff" : "#000",
              border: "1px solid #ccc"
            }}
          >
            R{v}
          </button>
        ))}
      </div>

      <button
	type="button"
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          padding: 14,
          background: "#000",
          color: "#fff",
          fontSize: 16
        }}
      >
        {loading ? "Redirecting…" : `Pay R${amount}`}
      </button>

      <p style={{ fontSize: 12, marginTop: 12 }}>
        Secure payment via PayFast<br />
        Hosted by Shields Consulting
      </p>
    </div>
  );
}
