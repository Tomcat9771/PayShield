import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api";

export default function PayQR() {

  const { qr_code } = useParams();

  const [merchant, setMerchant] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
     LOAD MERCHANT NAME
  ============================= */

  useEffect(() => {

    const loadMerchant = async () => {

      try {

        const res = await api.get(`/ozow/qr/${qr_code}`);

        setMerchant(res.data.merchant);

      } catch (err) {

        console.error("QR lookup failed", err);
        setError("Invalid QR code");

      }

    };

    if (qr_code) {
      loadMerchant();
    }

  }, [qr_code]);

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
        qr_code,
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
        background: "linear-gradient(135deg,#4c0070,#2d0050)"
      }}
    >

      <div
        style={{
          background: "#ffffff",
          padding: "40px",
          borderRadius: "16px",
          width: "380px",
          textAlign: "center",
          boxShadow: "0 15px 35px rgba(0,0,0,0.25)"
        }}
      >

        {/* =============================
            MERCHANT INFO
        ============================= */}

        {merchant ? (

          <>
            <h2
              style={{
                color: "#111",
                marginBottom: "5px",
                fontWeight: "600"
              }}
            >
              {merchant}
            </h2>

            <div
              style={{
                fontSize: "12px",
                color: "#16a34a",
                fontWeight: "bold",
                marginBottom: "6px"
              }}
            >
              ✔ Verified PayShield Merchant
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#777",
                marginBottom: "15px"
              }}
            >
              Powered by PayShield
            </div>

          </>

        ) : (

          <p style={{ color: "#444" }}>
            Loading merchant...
          </p>

        )}

        {/* =============================
            AMOUNT
        ============================= */}

        <input
          placeholder="Amount (ZAR)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginTop: "10px",
            fontSize: "14px"
          }}
        />

        {/* =============================
            REFERENCE
        ============================= */}

        <input
          placeholder="Reference (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginTop: "10px",
            fontSize: "14px"
          }}
        />

        {/* =============================
            PAY BUTTON
        ============================= */}

        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "14px",
            background: "#facc15",
            border: "none",
            borderRadius: "10px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >

          {loading ? "Redirecting..." : "Pay Now"}

        </button>

        {/* =============================
            ERROR MESSAGE
        ============================= */}

        {error && (

          <p
            style={{
              color: "red",
              marginTop: "12px",
              fontSize: "13px"
            }}
          >
            {error}
          </p>

        )}

      </div>

    </div>

  );
}