import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api";

export default function PayQR() {

  const { qrCode } = useParams();   // FIXED PARAM NAME

  const [merchant, setMerchant] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
     LOAD MERCHANT
  ============================= */

  useEffect(() => {

    const loadMerchant = async () => {

      try {

        const res = await api.get(`/ozow/qr/${qrCode}`);

        console.log("Merchant API:", res.data);

        setMerchant(res.data.merchant);

      } catch (err) {

        console.error("QR lookup failed", err);
        setError("Invalid QR code");

      }

    };

    if (qrCode) {
      loadMerchant();
    }

  }, [qrCode]);

  /* =============================
     CREATE PAYMENT
  ============================= */

  const handlePayment = async () => {

    setError("");

    if (!amount) {
      setError("Enter an amount");
      return;
    }

    try {

      setLoading(true);

      const res = await api.post("/ozow/create-payment", {
        qr_code: qrCode,
        amount,
        reference
      });

      window.location.href = res.data.paymentUrl;

    } catch (err) {

      console.error(err);

      setError(
        err?.response?.data?.error ||
        "Payment failed"
      );

    } finally {

      setLoading(false);

    }

  };

  return (

    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#3b0764"
      }}
    >

      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "16px",
          width: "380px",
          textAlign: "center"
        }}
      >

        {merchant ? (
          <>
            <h2 style={{ color: "#111" }}>
              Pay {merchant}
            </h2>
            <p style={{ fontSize: "12px", color: "#666" }}>
              Powered by PayShield
            </p>
          </>
        ) : (
          <p style={{ color: "#111" }}>
            Loading merchant...
          </p>
        )}

        <input
          placeholder="Amount (ZAR)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px"
          }}
        />

        <input
          placeholder="Reference (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px"
          }}
        />

        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: "#facc15",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold"
          }}
        >
          {loading ? "Redirecting..." : "Pay Now"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>
            {error}
          </p>
        )}

      </div>

    </div>
  );
}