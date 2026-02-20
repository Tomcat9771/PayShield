import { useState } from "react";
import axios from "axios";

export default function PaymentPage() {
  const [businessId, setBusinessId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:4000/api/ozow/create",
        {
          business_id: businessId,
          amount: Number(amount),
        }
      );

      window.location.href = response.data.paymentUrl;

    } catch (err) {
      console.error(err);
      alert("Payment creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1>PayShield</h1>

      <input
        placeholder="Business ID"
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Amount (ZAR)"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={inputStyle}
      />

      <button onClick={handlePayment} disabled={loading} style={buttonStyle}>
        {loading ? "Processing..." : "Pay with Ozow EFT"}
      </button>
    </div>
  );
}

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  maxWidth: "400px",
  margin: "100px auto",
};

const inputStyle = {
  padding: "12px",
  fontSize: "16px",
};

const buttonStyle = {
  padding: "14px",
  fontSize: "16px",
  backgroundColor: "#5a2ca0",
  color: "white",
  border: "none",
  cursor: "pointer",
};
