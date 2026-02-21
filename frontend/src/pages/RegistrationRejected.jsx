import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function RegistrationRejected() {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReason = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!business) {
        navigate("/create-business");
        return;
      }

      const { data: registration } = await supabase
        .from("business_registrations")
        .select("rejection_reason")
        .eq("business_id", business.id)
        .single();

      if (!registration) {
        navigate("/create-business");
        return;
      }

      setReason(registration.rejection_reason || "No reason provided.");
      setLoading(false);
    };

    fetchReason();
  }, [navigate]);

  if (loading) {
    return <div style={layout.contentWrapper}>Loading...</div>;
  }

  return (
    <div
      style={{
        ...layout.page,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...components.card,
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        <h2 style={{ ...typography.heading, color: colors.gold }}>
          ❌ Registration Rejected
        </h2>

        <p style={typography.text}>
          Unfortunately your registration was not approved.
        </p>

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "8px",
            textAlign: "left",
          }}
        >
          <strong style={{ color: colors.gold }}>Reason:</strong>
          <p style={{ marginTop: "8px", color: colors.white }}>
            {reason}
          </p>
        </div>

        <GoldButton
          onClick={() => navigate("/create-business")}
          style={{ marginTop: "25px" }}
        >
          Edit & Resubmit
        </GoldButton>
      </div>
    </div>
  );
}