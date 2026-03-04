import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PayCustomer() {
  const { qrCode } = useParams();

  const [business, setBusiness] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMerchant = async () => {
      const { data } = await supabase
        .from("qr_codes")
        .select(`
          code,
          registration_id,
          business_registrations (
            business_id,
            businesses (
              business_name
            )
          )
        `)
        .eq("code", qrCode)
        .single();

      if (data) {
        setBusiness({
          id: data.business_registrations.business_id,
          name: data.business_registrations.businesses.business_name
        });
      }
    };

    loadMerchant();
  }, [qrCode]);

  const payNow = async () => {
    setLoading(true);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/ozow/create-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          business_id: business.id,
          amount,
          reference
        })
      }
    );

    const data = await res.json();

    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    }

    setLoading(false);
  };

  if (!business) return <div>Loading merchant...</div>;

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 30 }}>
      <h2>Pay {business.name}</h2>

      <input
        type="number"
        placeholder="Amount (ZAR)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 15 }}
      />

      <input
        type="text"
        placeholder="Reference (optional)"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 20 }}
      />

      <button
        onClick={payNow}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          background: "#5a189a",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Pay with Ozow
      </button>
    </div>
  );
}