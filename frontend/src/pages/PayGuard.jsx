import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://guardpay-api.onrender.com/api";

export default function PayGuard() {
  const { guardId } = useParams();

  const [guard, setGuard] = useState(null);
  const [amount, setAmount] = useState("20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guardId) return;

    let cancelled = false;

    async function loadGuard() {
      try {
        const res = await axios.get(`${API_BASE}/guards/public`, {
          params: { id: guardId },
        });
        if (!cancelled) setGuard(res.data);
      } catch {
        if (!cancelled) setError("This guard could not be found.");
      }
    }

    loadGuard();
    return () => (cancelled = true);
  }, [guardId]);

  async function handlePay() {
    const numericAmount = Number(amount);
    if (loading || numericAmount < 10) return;

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/payments/payfast`, {
        guard_id: guardId,
        amount: numericAmount,
      });

      const { action, fields } = res.data;

      const orderedKeys = [
        "merchant_id",
        "merchant_key",
        "return_url",
        "cancel_url",
        "notify_url",
        "amount",
        "item_name",
        "custom_str1",
        "signature",
      ];

      const form = document.createElement("form");
      form.method = "POST";
      form.action = action;

      orderedKeys.forEach((key) => {
        if (fields[key] === undefined) return;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch {
      setError("Payment failed. Please try again.");
      setLoading(false);
    }
  }

  if (error) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>{error}</p>;
  }

  if (!guard) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Loading…</p>;
  }

  const numericAmount = Number(amount);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "60px auto",
        padding: "0 20px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
  <img
    src="/shieldpay-logo.png"
    alt="PayShield"
    style={{
      width: 120,
      maxWidth: "100%",
      display: "inline-block",
    }}
  />
</div>

      <h1 style={{ marginBottom: 4 }}>You are supporting</h1>
      <h2 style={{ marginTop: 0 }}>{guard.full_name}</h2>

      <p style={{ color: "#666", marginBottom: 18 }}>
        {guard.site_location}
      </p>

      <p>
        This is a <strong>voluntary support payment</strong> to show appreciation
        for our on-site security staff.
      </p>

      <p style={{ color: "#666", marginBottom: 28 }}>
        Payments are processed securely using <strong>PayFast</strong> and paid
        out to the guard.
      </p>

      {/* Preset buttons */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        {["10", "20", "50"].map((val) => (
          <button
            key={val}
            onClick={() => setAmount(val)}
            style={{
              minWidth: 72,
              padding: "12px 0",
              fontSize: 16,
              fontWeight: "bold",
              borderRadius: 10,
              border: "2px solid #5b1f82",
              background: amount === val ? "#5b1f82" : "#fff",
              color: amount === val ? "#fff" : "#5b1f82",
              cursor: "pointer",
            }}
          >
            R{val}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: "bold" }}>R</span>
        <input
          type="number"
          min="10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            if (!numericAmount || numericAmount < 10) setAmount("10");
          }}
          style={{
            width: 160,
            padding: 12,
            fontSize: 18,
            textAlign: "center",
            borderRadius: 10,
            border: "2px solid #ccc",
          }}
        />
      </div>

      <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
        Minimum amount: R10
      </p>

      {/* MAIN PAY BUTTON */}
      <button
        disabled={loading || numericAmount < 10}
        onClick={handlePay}
        style={{
          width: "100%",
          padding: "16px 0",
          fontSize: 20,
          fontWeight: "bold",
          borderRadius: 14,
          border: "none",
          background:
            loading || numericAmount < 10 ? "#d6c27a" : "#f5c400",
          color: "#3b2a00",
          cursor:
            loading || numericAmount < 10 ? "not-allowed" : "pointer",
          boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
        }}
      >
        {loading ? "Redirecting…" : `Pay R${numericAmount}`}
      </button>

      <p style={{ fontSize: 13, color: "#777", marginTop: 30 }}>
        PayShield is proudly sponsored by{" "}
        <strong>Shields Consulting</strong>.
      </p>
    </div>
  );
}
