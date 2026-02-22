import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If session exists, user is verified and logged in
      if (session) {
        setChecking(false);
      } else {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

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
          width: "420px",
          textAlign: "center",
        }}
      >
        <img
          src="/shieldpay-logo.png"
          alt="PayShield Logo"
          style={{
            height: "60px",
            marginBottom: "20px",
          }}
        />

        <h2 style={typography.heading}>
          🎉 Email Successfully Verified
        </h2>

        <p style={{ marginTop: "15px", color: colors.white }}>
          Your PayShield account has been activated.
        </p>

        <p style={{ marginTop: "10px", color: colors.white }}>
          You can now log in and begin your business registration.
        </p>

        <GoldButton
          style={{ marginTop: "20px" }}
          onClick={() => navigate("/login")}
        >
          Go to Login
        </GoldButton>
      </div>
    </div>
  );
}