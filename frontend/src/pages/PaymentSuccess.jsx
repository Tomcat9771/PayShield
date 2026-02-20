import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PaymentSuccess() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("registration_fee_paid")
        .eq("user_id", user.id)
        .maybeSingle();

      if (business?.registration_fee_paid) {
        setStatus("success");

        setTimeout(() => {
          window.location.href = "/awaiting-approval";
        }, 2000);

      } else {
        // Webhook may still be processing
        setTimeout(checkPaymentStatus, 2000);
      }
    };

    checkPaymentStatus();
  }, []);

  if (status === "checking") {
    return (
      <div style={{ padding: 30 }}>
        <h2>Processing Payment...</h2>
        <p>Please wait while we confirm your payment.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Payment Successful 🎉</h2>
      <p>Your registration fee has been received.</p>
      <p>Redirecting to approval screen...</p>
    </div>
  );
}
