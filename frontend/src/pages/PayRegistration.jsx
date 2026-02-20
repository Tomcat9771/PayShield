import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PayRegistration() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBusiness = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("businesses")
        .select("id, business_name, registration_fee_paid")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        window.location.href = "/create-business";
        return;
      }

      if (data.registration_fee_paid) {
        window.location.href = "/awaiting-approval";
        return;
      }

      setBusiness(data);
      setLoading(false);
    };

    loadBusiness();
  }, []);

  const handlePayment = async () => {
    try {
      setError("");

      const response = await fetch("/api/ozow/create-registration-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessId: business.id
        })
      });

      const result = await response.json();

      if (!result.paymentUrl) {
        throw new Error("Payment initialization failed");
      }

      window.location.href = result.paymentUrl;

    } catch (err) {
      console.error(err);
      setError("Failed to start payment. Please try again.");
    }
  };

  if (loading) {
    return <div style={{ padding: 30 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Registration Fee Payment</h2>

      <p>
        Business: <strong>{business.business_name}</strong>
      </p>

      <p>
        Registration Fee: <strong>R150.00</strong>
      </p>

      <button onClick={handlePayment}>
        Pay Now
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
